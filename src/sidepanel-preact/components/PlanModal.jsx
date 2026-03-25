import { useEffect } from 'preact/hooks';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function PlanModal({ plan, onApprove, onCancel }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  const trapRef = useFocusTrap(true);

  return (
    <div class="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Review plan" ref={trapRef}>
        <div class="modal-header">
          <span>Review Plan</span>
          <button class="close-btn" onClick={onCancel} aria-label="Close plan review">&times;</button>
        </div>
        <div class="modal-body">
          <div class="plan-section">
            <h4>Domains to visit:</h4>
            <ul class="plan-domains">
              {(plan.domains || []).map((domain, i) => (
                <li key={i}>{domain}</li>
              ))}
            </ul>
          </div>

          <div class="plan-section">
            <h4>Approach:</h4>
            <ul class="plan-steps">
              {(Array.isArray(plan.approach) ? plan.approach : [plan.approach]).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button class="btn btn-primary" onClick={onApprove}>
            Approve & Continue
          </button>
        </div>
      </div>
    </div>
  );
}
