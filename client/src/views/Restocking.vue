<template>
  <div class="restocking">
    <div class="page-header">
      <h2>{{ t("restocking.title") }}</h2>
      <p>{{ t("restocking.description") }}</p>
    </div>

    <div v-if="loading" class="loading">{{ t("common.loading") }}</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else>
      <div class="card budget-card">
        <div class="card-header">
          <h3 class="card-title">{{ t("restocking.budgetLabel") }}</h3>
        </div>
        <div class="budget-body">
          <div class="budget-value">
            {{ currencySymbol }}{{ budget.toLocaleString() }}
          </div>
          <input
            type="range"
            class="budget-slider"
            min="0"
            :max="maxBudget"
            step="100"
            v-model.number="budget"
          />
          <p class="budget-help">{{ t("restocking.budgetHelp") }}</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card info">
          <div class="stat-label">
            {{
              t("restocking.itemsSelected", { count: recommendations.length })
            }}
          </div>
          <div class="stat-value">{{ recommendations.length }}</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">{{ t("restocking.totalSpend") }}</div>
          <div class="stat-value">
            {{ currencySymbol }}{{ totalSpend.toLocaleString() }}
          </div>
        </div>
        <div class="stat-card warning">
          <div class="stat-label">{{ t("restocking.remainingBudget") }}</div>
          <div class="stat-value">
            {{ currencySymbol }}{{ remainingBudget.toLocaleString() }}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">{{ t("restocking.recommendedItems") }}</h3>
        </div>

        <div v-if="recommendations.length === 0" class="no-recommendations">
          {{ t("restocking.noRecommendations") }}
        </div>
        <div v-else class="table-container">
          <table>
            <thead>
              <tr>
                <th>{{ t("restocking.table.sku") }}</th>
                <th>{{ t("restocking.table.itemName") }}</th>
                <th>{{ t("restocking.table.category") }}</th>
                <th>{{ t("restocking.table.warehouse") }}</th>
                <th>{{ t("restocking.table.shortfall") }}</th>
                <th>{{ t("restocking.table.unitCost") }}</th>
                <th>{{ t("restocking.table.lineTotal") }}</th>
                <th>{{ t("restocking.table.leadTime") }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in recommendations" :key="item.item_sku">
                <td>
                  <strong>{{ item.item_sku }}</strong>
                </td>
                <td>{{ item.item_name }}</td>
                <td>{{ item.category }}</td>
                <td>{{ item.warehouse }}</td>
                <td>{{ item.shortfall }}</td>
                <td>
                  {{ currencySymbol }}{{ item.unit_cost.toLocaleString() }}
                </td>
                <td>
                  <strong
                    >{{ currencySymbol
                    }}{{ item.lineTotal.toLocaleString() }}</strong
                  >
                </td>
                <td>
                  {{
                    t("restocking.leadTimeDays", { count: item.lead_time_days })
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="order-actions">
          <button
            class="place-order-btn"
            :disabled="recommendations.length === 0 || submitting"
            @click="placeOrder"
          >
            {{
              submitting
                ? t("restocking.placingOrder")
                : t("restocking.placeOrder")
            }}
          </button>
          <div v-if="submitSuccess" class="submit-success">
            {{ t("restocking.orderSuccess") }}
          </div>
          <div v-if="submitError" class="submit-error">{{ submitError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { api } from "../api";
import { useI18n } from "../composables/useI18n";

export default {
  name: "Restocking",
  setup() {
    const { t, currentCurrency } = useI18n();

    const currencySymbol = computed(() => {
      return currentCurrency.value === "JPY" ? "¥" : "$";
    });

    const loading = ref(true);
    const error = ref(null);
    const forecasts = ref([]);

    const budget = ref(5000);
    const maxBudget = ref(10000);

    const submitting = ref(false);
    const submitSuccess = ref(false);
    const submitError = ref(null);

    const shortfallItems = computed(() => {
      return forecasts.value
        .map((item) => ({
          ...item,
          shortfall: item.forecasted_demand - item.current_demand,
        }))
        .filter((item) => item.shortfall > 0)
        .sort((a, b) => b.shortfall - a.shortfall);
    });

    const recommendations = computed(() => {
      let remaining = budget.value;
      const selected = [];

      for (const item of shortfallItems.value) {
        const lineTotal = item.shortfall * item.unit_cost;
        if (lineTotal <= remaining) {
          selected.push({ ...item, lineTotal });
          remaining -= lineTotal;
        }
      }

      return selected;
    });

    const totalSpend = computed(() => {
      return recommendations.value.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );
    });

    const remainingBudget = computed(() => {
      return budget.value - totalSpend.value;
    });

    const loadForecasts = async () => {
      loading.value = true;
      error.value = null;
      try {
        forecasts.value = await api.getDemandForecasts();

        const totalPossibleSpend = forecasts.value.reduce((sum, item) => {
          const shortfall = item.forecasted_demand - item.current_demand;
          return shortfall > 0 ? sum + shortfall * item.unit_cost : sum;
        }, 0);

        const computedMax = Math.ceil(totalPossibleSpend / 100) * 100;
        maxBudget.value = Math.max(computedMax, 1000);

        if (budget.value > maxBudget.value) {
          budget.value = maxBudget.value;
        }
      } catch (err) {
        error.value = "Failed to load demand forecasts: " + err.message;
      } finally {
        loading.value = false;
      }
    };

    const placeOrder = async () => {
      submitting.value = true;
      submitSuccess.value = false;
      submitError.value = null;
      try {
        for (const item of recommendations.value) {
          await api.createPurchaseOrder({
            item_sku: item.item_sku,
            item_name: item.item_name,
            quantity: item.shortfall,
            unit_cost: item.unit_cost,
            warehouse: item.warehouse,
            lead_time_days: item.lead_time_days,
            notes:
              "Restocking order generated from demand forecast recommendations",
          });
        }
        submitSuccess.value = true;
      } catch (err) {
        submitError.value = t("restocking.orderError", { error: err.message });
      } finally {
        submitting.value = false;
      }
    };

    onMounted(loadForecasts);

    return {
      t,
      currencySymbol,
      loading,
      error,
      budget,
      maxBudget,
      recommendations,
      totalSpend,
      remainingBudget,
      submitting,
      submitSuccess,
      submitError,
      placeOrder,
    };
  },
};
</script>

<style scoped>
.budget-card {
  margin-bottom: 1.5rem;
}

.budget-body {
  padding: 0.5rem 0 1rem;
}

.budget-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 1rem;
}

.budget-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
  outline: none;
  margin-bottom: 0.75rem;
}

.budget-slider::-webkit-slider-runnable-track {
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
}

.budget-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  margin-top: -7px;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.budget-slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: #e2e8f0;
}

.budget-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #2563eb;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.budget-help {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.no-recommendations {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}

.order-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.place-order-btn {
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.625rem 1.5rem;
  font-size: 0.9375rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.place-order-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.place-order-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.submit-success {
  color: #059669;
  font-weight: 500;
  font-size: 0.9375rem;
}

.submit-error {
  color: #dc2626;
  font-weight: 500;
  font-size: 0.9375rem;
}
</style>
