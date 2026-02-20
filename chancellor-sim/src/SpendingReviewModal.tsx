import React, { useMemo, useState } from 'react';
import { SpendingReviewState } from './game-state';

interface SpendingReviewModalProps {
  spendingReview: SpendingReviewState;
  fiscalHeadroom_bn: number;
  onConfirm: (departments: SpendingReviewState['departments']) => void;
}

const departmentOrder: Array<keyof SpendingReviewState['departments']> = [
  'nhs',
  'education',
  'defence',
  'infrastructure',
  'homeOffice',
  'localGov',
  'other',
];

export const SpendingReviewModal: React.FC<SpendingReviewModalProps> = ({
  spendingReview,
  fiscalHeadroom_bn,
  onConfirm,
}) => {
  const [departments, setDepartments] = useState<SpendingReviewState['departments']>(() => {
    const next = { ...spendingReview.departments };
    departmentOrder.forEach((key) => {
      const dept = { ...next[key] };
      dept.plannedResourceDEL_bn = [dept.resourceDEL_bn, ...(dept.plannedResourceDEL_bn || []).slice(1)];
      dept.plannedCapitalDEL_bn = [dept.capitalDEL_bn, ...(dept.plannedCapitalDEL_bn || []).slice(1)];
      next[key] = dept;
    });
    return next;
  });

  const totalPlanned = useMemo(() => {
    return departmentOrder.reduce((sum, key) => {
      const dept = departments[key];
      const r = dept.plannedResourceDEL_bn.reduce((a, b) => a + b, 0);
      const c = dept.plannedCapitalDEL_bn.reduce((a, b) => a + b, 0);
      return sum + r + c;
    }, 0);
  }, [departments]);

  return (
    <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-sm">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Spending Review</h2>
          <p className="text-sm text-gray-600 mt-1">Set three-year DEL plans. Fiscal headroom: £{fiscalHeadroom_bn.toFixed(1)}bn.</p>
          {totalPlanned > fiscalHeadroom_bn * 9 && (
            <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 p-2 rounded-sm">
              Proposed DEL envelope exceeds projected headroom. You can continue, but markets may react.
            </div>
          )}
        </div>
        <div className="p-5 space-y-4">
          {departmentOrder.map((key) => {
            const dept = departments[key];
            return (
              <div key={key} className="border border-gray-200 rounded-sm p-3">
                <div className="flex justify-between text-sm mb-2">
                  <div className="font-semibold">{dept.name}</div>
                  <div className="text-gray-600">Backlog {dept.backlog.toFixed(0)} · Delivery capacity {dept.deliveryCapacity.toFixed(0)}</div>
                </div>
                <div className="grid grid-cols-6 gap-2 text-sm">
                  {[0, 1, 2].map((yearIdx) => (
                    <React.Fragment key={`${key}_${yearIdx}`}>
                      <label className="text-gray-600 self-center">Y{yearIdx + 1} resource</label>
                      <input
                        type="number"
                        className="border border-gray-300 rounded-sm px-2 py-1"
                        value={yearIdx === 0 ? dept.resourceDEL_bn : dept.plannedResourceDEL_bn[yearIdx]}
                        disabled={yearIdx === 0}
                        onChange={(e) => {
                          const next = Number(e.target.value) || 0;
                          setDepartments((prev) => {
                            const copy = { ...prev, [key]: { ...prev[key] } } as SpendingReviewState['departments'];
                            copy[key].plannedResourceDEL_bn = [...copy[key].plannedResourceDEL_bn];
                            copy[key].plannedResourceDEL_bn[yearIdx] = next;
                            return copy;
                          });
                        }}
                      />
                    </React.Fragment>
                  ))}
                  {[0, 1, 2].map((yearIdx) => (
                    <React.Fragment key={`${key}_c_${yearIdx}`}>
                      <label className="text-gray-600 self-center">Y{yearIdx + 1} capital</label>
                      <input
                        type="number"
                        className="border border-gray-300 rounded-sm px-2 py-1"
                        value={yearIdx === 0 ? dept.capitalDEL_bn : dept.plannedCapitalDEL_bn[yearIdx]}
                        disabled={yearIdx === 0}
                        onChange={(e) => {
                          const next = Number(e.target.value) || 0;
                          setDepartments((prev) => {
                            const copy = { ...prev, [key]: { ...prev[key] } } as SpendingReviewState['departments'];
                            copy[key].plannedCapitalDEL_bn = [...copy[key].plannedCapitalDEL_bn];
                            copy[key].plannedCapitalDEL_bn[yearIdx] = next;
                            return copy;
                          });
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => onConfirm(departments)}
            className="px-4 py-2 bg-blue-700 text-white rounded-sm hover:bg-blue-800"
          >
            Publish Spending Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpendingReviewModal;
