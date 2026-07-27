<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen && backlogItem" class="modal-overlay" @click="close">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h3 class="modal-title">
              {{
                mode === "create"
                  ? "Create Purchase Order"
                  : "Purchase Order Details"
              }}
            </h3>
            <button class="close-button" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <div class="modal-body">
            <div class="shortage-header">
              <div class="shortage-title-section">
                <h4 class="item-name">{{ backlogItem.item_name }}</h4>
                <div class="item-sku">SKU: {{ backlogItem.item_sku }}</div>
              </div>
            </div>

            <!-- CREATE MODE -->
            <template v-if="mode === 'create'">
              <div v-if="submitError" class="error-banner">
                {{ submitError }}
              </div>

              <form class="po-form" @submit.prevent="submitPO">
                <div class="form-grid">
                  <div class="form-field">
                    <label class="form-label">Quantity</label>
                    <input
                      type="number"
                      class="form-input"
                      v-model.number="form.quantity"
                      min="1"
                    />
                  </div>

                  <div class="form-field">
                    <label class="form-label">Unit Cost ($)</label>
                    <input
                      type="number"
                      class="form-input"
                      v-model.number="form.unit_cost"
                      min="0.01"
                      step="0.01"
                    />
                  </div>

                  <div class="form-field">
                    <label class="form-label">Warehouse</label>
                    <input
                      type="text"
                      class="form-input"
                      v-model="form.warehouse"
                    />
                  </div>

                  <div class="form-field">
                    <label class="form-label">Lead Time (days)</label>
                    <input
                      type="number"
                      class="form-input"
                      v-model.number="form.lead_time_days"
                      min="1"
                    />
                  </div>
                </div>

                <div class="form-field full">
                  <label class="form-label">Notes (optional)</label>
                  <textarea
                    class="form-textarea"
                    v-model="form.notes"
                    rows="3"
                  ></textarea>
                </div>

                <div class="form-summary">
                  <div class="summary-label">Estimated Total Cost</div>
                  <div class="summary-value">{{ formattedTotalCost }}</div>
                </div>
              </form>
            </template>

            <!-- VIEW MODE -->
            <template v-else>
              <div class="info-grid" v-if="backlogItem.purchase_order">
                <div class="info-item">
                  <div class="info-label">Item Name</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.item_name }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Item SKU</div>
                  <div class="info-value sku">
                    {{ backlogItem.purchase_order.item_sku }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Quantity</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.quantity }} units
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Unit Cost</div>
                  <div class="info-value">
                    ${{
                      Number(backlogItem.purchase_order.unit_cost).toFixed(2)
                    }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Total Cost</div>
                  <div class="info-value">
                    ${{
                      Number(backlogItem.purchase_order.total_cost).toFixed(2)
                    }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Warehouse</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.warehouse }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Lead Time</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.lead_time_days }} days
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Expected Delivery</div>
                  <div class="info-value">
                    {{
                      formatDate(
                        backlogItem.purchase_order.expected_delivery_date,
                      )
                    }}
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Status</div>
                  <div class="info-value">
                    <span class="badge success">{{
                      backlogItem.purchase_order.status
                    }}</span>
                  </div>
                </div>
                <div class="info-item">
                  <div class="info-label">Created Date</div>
                  <div class="info-value">
                    {{ formatDate(backlogItem.purchase_order.created_date) }}
                  </div>
                </div>
                <div
                  class="info-item full"
                  v-if="backlogItem.purchase_order.notes"
                >
                  <div class="info-label">Notes</div>
                  <div class="info-value">
                    {{ backlogItem.purchase_order.notes }}
                  </div>
                </div>
              </div>
              <div v-else class="no-data">
                No purchase order details available.
              </div>
            </template>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Close</button>
            <button
              v-if="mode === 'create'"
              class="btn-primary"
              :disabled="!isFormValid || submitting"
              @click="submitPO"
            >
              {{ submitting ? "Submitting..." : "Submit Purchase Order" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { api } from "../api";

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  backlogItem: {
    type: Object,
    default: null,
  },
  mode: {
    type: String,
    default: "create",
  },
});

const emit = defineEmits(["close", "po-created"]);

const submitting = ref(false);
const submitError = ref(null);

const form = ref({
  quantity: 0,
  unit_cost: 0,
  warehouse: "",
  lead_time_days: 7,
  notes: "",
});

const resetForm = () => {
  if (!props.backlogItem) return;
  const shortage = Math.max(
    (props.backlogItem.quantity_needed || 0) -
      (props.backlogItem.quantity_available || 0),
    1,
  );
  form.value = {
    quantity: shortage,
    unit_cost: 0,
    warehouse: props.backlogItem.warehouse || "",
    lead_time_days: 7,
    notes: "",
  };
  submitError.value = null;
  submitting.value = false;
};

watch(
  () => [props.isOpen, props.backlogItem, props.mode],
  () => {
    if (props.isOpen && props.mode === "create") {
      resetForm();
    }
  },
  { immediate: true },
);

const isFormValid = computed(() => {
  return (
    Number(form.value.quantity) > 0 &&
    Number(form.value.unit_cost) > 0 &&
    Number(form.value.lead_time_days) > 0 &&
    !!form.value.warehouse
  );
});

const formattedTotalCost = computed(() => {
  const total =
    (Number(form.value.quantity) || 0) * (Number(form.value.unit_cost) || 0);
  return `$${total.toFixed(2)}`;
});

const close = () => {
  emit("close");
};

const submitPO = async () => {
  if (!isFormValid.value || submitting.value || !props.backlogItem) return;

  submitting.value = true;
  submitError.value = null;

  try {
    const response = await api.createPurchaseOrder({
      item_sku: props.backlogItem.item_sku,
      item_name: props.backlogItem.item_name,
      quantity: Number(form.value.quantity),
      unit_cost: Number(form.value.unit_cost),
      warehouse: form.value.warehouse,
      lead_time_days: Number(form.value.lead_time_days),
      notes: form.value.notes || undefined,
    });

    // Backend response doesn't include backlog_item_id, so merge it in
    // so Dashboard's handler can match it back to the originating row.
    emit("po-created", { ...response, backlog_item_id: props.backlogItem.id });
  } catch (err) {
    submitError.value = "Failed to create purchase order: " + err.message;
    console.error(err);
  } finally {
    submitting.value = false;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  max-width: 700px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.close-button {
  background: none;
  border: none;
  color: #64748b;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.close-button:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.shortage-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;
}

.shortage-title-section {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem 0;
}

.item-sku {
  font-size: 0.875rem;
  color: #64748b;
  font-family: "Monaco", "Courier New", monospace;
}

.error-banner {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1.25rem;
}

.po-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field.full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.form-input,
.form-textarea {
  padding: 0.625rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.938rem;
  color: #0f172a;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #3b82f6;
}

.form-textarea {
  resize: vertical;
}

.form-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.summary-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item.full {
  grid-column: 1 / -1;
}

.info-label {
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.info-value {
  font-size: 0.938rem;
  color: #0f172a;
  font-weight: 500;
}

.info-value.sku {
  font-family: "Monaco", "Courier New", monospace;
  color: #2563eb;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.813rem;
  font-weight: 600;
  text-transform: capitalize;
}

.badge.success {
  background: #d1fae5;
  color: #065f46;
}

.no-data {
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.875rem;
  color: #334155;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-secondary:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: #3b82f6;
  border: 1px solid #3b82f6;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  color: white;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: inherit;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  border-color: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
