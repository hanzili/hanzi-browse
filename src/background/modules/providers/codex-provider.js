/**
 * Codex Provider
 * Handles Codex/ChatGPT Pro API through relay proxy when available,
 * with native messaging as a fallback.
 *
 * Uses OAuth credentials from Codex CLI (~/.codex/auth.json)
 * Routes through the local relay to bypass CORS and use authenticated requests.
 */

import { BaseProvider } from './base-provider.js';
import { filterClaudeOnlyTools } from '../../../tools/definitions.js';
import { isRelayConnected, proxyApiCall } from '../relay-client.js';

const NATIVE_HOST_NAME = 'com.hanzi_browse.oauth_host';
const CODEX_API_URL = 'https://chatgpt.com/backend-api/codex/responses';

export class CodexProvider extends BaseProvider {
  getName() {
    return 'codex';
  }

  static matchesUrl(baseUrl) {
    return baseUrl.includes('chatgpt.com') || baseUrl.includes('codex');
  }

  getHeaders() {
    // Headers are handled by the proxy using stored credentials
    return {
      'Content-Type': 'application/json',
    };
  }

  buildUrl(_useStreaming) {
    return CODEX_API_URL;
  }

  buildRequestBody(messages, systemPrompt, tools, _useStreaming) {
    // Extract text from systemPrompt array (Anthropic format)
    const systemText = Array.isArray(systemPrompt)
      ? systemPrompt.map(p => p.text).join('\n\n')
      : systemPrompt;

    // Convert messages to Responses API "input" format
    const input = this._convertToResponsesInput(messages);

    // Codex uses Responses API format (not chat completions)
    // Required: store=false, stream=true (Codex backend requires these)
    return {
      model: this.config.model || 'gpt-5.1-codex-max',
      instructions: systemText,
      input: input,
      tools: this._convertToolsForResponses(tools),
      stream: true,  // Codex backend requires stream=true
      store: false,  // Required by Codex API
    };
  }

  /**
   * Override call method to use relay proxy when available.
   */
  async call(messages, systemPrompt, tools, onTextChunk, log) {
    const useStreaming = !!onTextChunk;
    const requestBody = this.buildRequestBody(messages, systemPrompt, tools, useStreaming);
    const url = this.buildUrl(useStreaming);

    const proxyDetails = {
      url,
      model: requestBody.model,
      messageCount: messages.length,
      streaming: useStreaming,
    };

    if (isRelayConnected()) {
      await log?.('DEBUG', 'Codex API call through relay proxy', proxyDetails);
      return this._callViaRelay(url, requestBody, onTextChunk);
    }

    await log?.('DEBUG', 'Codex API call through native host', proxyDetails);
    return this._callViaNativeHost(url, requestBody, onTextChunk);
  }

  async _callViaRelay(url, requestBody, onTextChunk) {
    let result = {
      content: [],
      usage: null,
      stop_reason: 'end_turn',
    };
    let currentText = '';
    let itemsById = {};

    await proxyApiCall(url, JSON.stringify(requestBody), (event) => {
      currentText = this._handleStreamChunk(event, itemsById, currentText, result, onTextChunk);
    });

    this._finalizeStreamResult(result, currentText, itemsById);
    return result;
  }

  _callViaNativeHost(url, requestBody, onTextChunk) {
    const REQUEST_TIMEOUT_MS = 150000;
    return new Promise((resolve, reject) => {
      let port = null;
      let settled = false;
      let timeoutId = null;
      let result = {
        content: [],
        usage: null,
        stop_reason: 'end_turn',
      };
      let currentText = '';
      let itemsById = {};  // Track Responses API items by id

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (port) {
          try {
            port.disconnect();
          } catch {
            // Native port may already be closed.
          }
          port = null;
        }
      };

      const settleResolve = (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      };

      const settleReject = (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      try {
        port = chrome.runtime.connectNative(NATIVE_HOST_NAME);

        timeoutId = setTimeout(() => {
          settleReject(new Error(`Codex request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`));
        }, REQUEST_TIMEOUT_MS);

        port.onMessage.addListener(async (message) => {
          if (settled) return;

          if (message.type === 'stream_chunk') {
            currentText = this._handleStreamChunk(message.data, itemsById, currentText, result, onTextChunk);

          } else if (message.type === 'stream_end') {
            this._finalizeStreamResult(result, currentText, itemsById);
            settleResolve(result);

          } else if (message.type === 'api_response') {
            if (message.status >= 400) {
              settleReject(new Error(`Codex API error: ${message.status} - ${message.body}`));
              return;
            }

            try {
              const response = JSON.parse(message.body);
              const normalized = this.normalizeResponse(response);
              settleResolve(normalized);
            } catch (e) {
              settleReject(new Error(`Failed to parse Codex response: ${e.message}`));
            }

          } else if (message.type === 'api_error') {
            settleReject(new Error(message.error));
          }
        });

        port.onDisconnect.addListener(() => {
          if (settled) return;
          if (chrome.runtime.lastError) {
            settleReject(new Error(`Native host error: ${chrome.runtime.lastError.message}`));
            return;
          }
          settleReject(new Error('Codex native host disconnected before the request completed.'));
        });

        // Send API request through proxy
        port.postMessage({
          type: 'proxy_api_call',
          data: {
            url,
            method: 'POST',
            body: JSON.stringify(requestBody),
            headers: this.getHeaders(),
          },
        });

      } catch (error) {
        settleReject(new Error(`Failed to connect to native host: ${error.message}`));
      }
    });
  }

  normalizeResponse(response) {
    let content;
    let stopReason;

    if (response.output) {
      ({ content, stopReason } = this._normalizeResponsesApiOutput(response));
    } else if (response.choices?.[0]?.message) {
      ({ content, stopReason } = this._normalizeChatCompletionsOutput(response));
    } else {
      throw new Error(`Unexpected Codex response format: ${JSON.stringify(response).substring(0, 200)}`);
    }

    // Ensure content is never empty
    if (content.length === 0) {
      content.push({ type: 'text', text: '' });
    }

    return {
      content,
      stop_reason: stopReason,
      usage: response.usage,
    };
  }

  _trackItem(itemsById, item) {
    itemsById[item.id] = {
      id: item.id,
      type: item.type,
      call_id: item.call_id,
      name: item.name || '',
      arguments: item.arguments || '',
    };
  }

  _handleStreamChunk(event, itemsById, currentText, result, onTextChunk) {
    if (event.type === 'response.output_item.added') {
      if (event.item) {
        this._trackItem(itemsById, event.item);
      }
    } else if (event.type === 'response.output_item.done') {
      if (event.item?.type === 'function_call') {
        this._trackItem(itemsById, event.item);
      }
    } else if (event.type === 'response.output_text.delta') {
      const text = event.delta || '';
      currentText += text;
      if (onTextChunk) onTextChunk(text);
    } else if (event.type === 'response.function_call_arguments.delta') {
      if (event.item_id && itemsById[event.item_id]) {
        itemsById[event.item_id].arguments += event.delta || '';
      }
    } else if (event.type === 'response.function_call_arguments.done') {
      if (event.item_id && itemsById[event.item_id]) {
        itemsById[event.item_id].arguments = event.arguments || '';
      }
    } else if (event.type === 'response.completed') {
      this._handleResponseCompleted(event.response, itemsById, result);
    }

    if (event.usage) {
      result.usage = event.usage;
    }

    return currentText;
  }

  _handleResponseCompleted(response, itemsById, result) {
    if (response?.usage) {
      result.usage = response.usage;
    }
    if (response?.status === 'incomplete') {
      result.stop_reason = 'max_tokens';
    }
    if (response?.output) {
      for (const item of response.output) {
        if (item.type === 'function_call') {
          this._trackItem(itemsById, item);
        }
      }
    }
  }

  _finalizeStreamResult(result, currentText, itemsById) {
    if (currentText) {
      result.content.push({ type: 'text', text: currentText });
    }

    let hasToolCalls = false;
    for (const item of Object.values(itemsById)) {
      if (item.type === 'function_call' && item.name) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(item.arguments || '{}');
        } catch (e) {
          parsedArgs = {};
        }

        result.content.push({
          type: 'tool_use',
          id: item.call_id || item.id,
          name: item.name,
          input: parsedArgs,
        });
        hasToolCalls = true;
      }
    }

    if (hasToolCalls) {
      result.stop_reason = 'tool_use';
    }

    if (result.content.length === 0) {
      result.content.push({ type: 'text', text: '' });
    }
  }

  _normalizeResponsesApiOutput(response) {
    const content = [];
    let stopReason = 'end_turn';

    for (const item of response.output) {
      if (item.type === 'message' && item.role === 'assistant') {
        for (const part of item.content || []) {
          if (part.type === 'output_text' && part.text) {
            content.push({ type: 'text', text: part.text });
          }
        }
      } else if (item.type === 'function_call') {
        let parsedArgs = {};
        try {
          parsedArgs = typeof item.arguments === 'string'
            ? JSON.parse(item.arguments)
            : item.arguments || {};
        } catch (e) {
          parsedArgs = {};
        }

        content.push({
          type: 'tool_use',
          id: item.call_id,
          name: item.name,
          input: parsedArgs,
        });
        stopReason = 'tool_use';
      }
    }

    if (response.status === 'incomplete') {
      stopReason = 'max_tokens';
    }

    return { content, stopReason };
  }

  _normalizeChatCompletionsOutput(response) {
    const content = [];
    let stopReason = 'end_turn';
    const message = response.choices[0].message;

    if (message.content) {
      content.push({ type: 'text', text: message.content });
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        content.push({
          type: 'tool_use',
          id: toolCall.id,
          name: toolCall.function.name,
          input: typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments,
        });
      }
      stopReason = 'tool_use';
    }

    if (response.choices[0].finish_reason === 'length') {
      stopReason = 'max_tokens';
    }

    return { content, stopReason };
  }

  /**
   * Convert tools to Responses API format
   * Filters out Claude-only tools that don't work with OpenAI models
   * @private
   */
  _convertToolsForResponses(anthropicTools) {
    if (!anthropicTools || anthropicTools.length === 0) return [];

    // Filter out Claude-only tools (like turn_answer_start)
    const filteredTools = filterClaudeOnlyTools(anthropicTools);

    return filteredTools.map(tool => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }));
  }

  /**
   * Convert Anthropic messages to Responses API "input" format
   * Converts full conversation history for multi-turn support
   * @private
   */
  _convertToResponsesInput(anthropicMessages) {
    const input = [];

    for (const msg of anthropicMessages) {
      if (msg.role === 'user') {
        // User message - could be text or tool results
        if (typeof msg.content === 'string') {
          input.push({
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: msg.content }],
          });
        } else if (Array.isArray(msg.content)) {
          // Check if it's tool results or regular text
          const toolResults = msg.content.filter(b => b.type === 'tool_result');
          const textBlocks = msg.content.filter(b => b.type === 'text');

          // Add tool results as function_call_output
          for (const result of toolResults) {
            let output = result.content;
            if (Array.isArray(result.content)) {
              // Extract text from array content (skip images for now)
              output = result.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');
            }
            input.push({
              type: 'function_call_output',
              call_id: result.tool_use_id,
              output: typeof output === 'string' ? output : JSON.stringify(output),
            });
          }

          // Add text blocks as user message
          if (textBlocks.length > 0) {
            const text = textBlocks.map(b => b.text).join('\n');
            input.push({
              type: 'message',
              role: 'user',
              content: [{ type: 'input_text', text }],
            });
          }
        }
      } else if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        // Assistant message - could have text and/or tool calls
        const textBlocks = msg.content.filter(b => b.type === 'text');
        const toolUses = msg.content.filter(b => b.type === 'tool_use');

        // Add text response if present
        if (textBlocks.length > 0) {
          const text = textBlocks.map(b => b.text).join('\n');
          if (text.trim()) {
            input.push({
              type: 'message',
              role: 'assistant',
              content: [{ type: 'output_text', text }],
            });
          }
        }

        // Add function calls
        for (const toolUse of toolUses) {
          input.push({
            type: 'function_call',
            call_id: toolUse.id,
            name: toolUse.name,
            arguments: JSON.stringify(toolUse.input),
          });
        }
      }
    }

    return input;
  }
}
