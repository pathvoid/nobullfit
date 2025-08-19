import "phoenix_html"
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import topbar from "../vendor/topbar"

// Hook to reset form inputs after successful submission
const ActivityFormHook = {
  mounted() {
    this.handleEvent("activity-added", () => {
      // Reset all form inputs
      const inputs = this.el.querySelectorAll('input, select')
      inputs.forEach(input => {
        if (input.type === 'number') {
          input.value = ''
        } else if (input.tagName === 'SELECT') {
          input.selectedIndex = 0
        }
      })

      // Hide all validator hints
      const validatorHints = this.el.querySelectorAll('.validator-hint')
      validatorHints.forEach(hint => {
        hint.classList.add('hidden')
      })
    })
  }
}

// Hook to handle date picker changes
const DatePickerHook = {
  mounted() {
    this.el.addEventListener("change", (e) => {
      const selectedDate = new Date(e.target.value)
      const today = new Date()
      today.setHours(23, 59, 59, 999) // End of today

      if (selectedDate > today) {
        // Reset to today if future date is selected
        e.target.value = today.toISOString().split('T')[0]
        alert("Cannot select future dates. Date has been reset to today.")
      }

      this.pushEvent("change_date", { value: e.target.value })
    })
  }
}

// Hook to reset weight form inputs after successful submission
const WeightFormHook = {
  mounted() {
    this.handleEvent("weight-added", () => {
      // Reset all form inputs
      const inputs = this.el.querySelectorAll('input, select')
      inputs.forEach(input => {
        if (input.type === 'number') {
          input.value = ''
        } else if (input.tagName === 'SELECT') {
          // Keep the preferred unit selected
          const preferredUnit = input.getAttribute('data-preferred-unit')
          if (preferredUnit) {
            input.value = preferredUnit
          }
        }
      })
      // Hide all validator hints
      const validatorHints = this.el.querySelectorAll('.validator-hint')
      validatorHints.forEach(hint => {
        hint.classList.add('hidden')
      })
    })
  }
}

// Hook to send timezone data to LiveView
const TimezoneDataHook = {
  mounted() {
    // Send timezone data to LiveView if available
    if (window.timezoneData) {
      this.pushEvent("timezone-data", window.timezoneData)
    }
  }
}

// Hook to reset grocery item form inputs after successful submission
const GroceryItemFormHook = {
  mounted() {
    this.handleEvent("reset-item-form", () => {
      // Reset all form inputs
      const inputs = this.el.querySelectorAll('input')
      inputs.forEach(input => {
        input.value = ''
      })
    })
  }
}

// Hook to initialize CanvasJS charts for dashboard
const DashboardChartHook = {
  mounted() {
    if (typeof CanvasJS !== 'undefined') {
      this.initializeAllCharts()
    }

    // Listen for theme changes
    this.handleEvent("theme-changed", () => {
      if (typeof CanvasJS !== 'undefined') {
        this.initializeAllCharts()
      }
    })
  },

  updated() {
    // Reinitialize charts when data updates
    if (typeof CanvasJS !== 'undefined') {
      this.initializeAllCharts()
    }
  },

  initializeAllCharts() {
    // Only initialize charts that have containers (meaning they have data)
    if (this.el.querySelector('#weightChart')) {
      this.initializeWeightChart()
    }
    if (this.el.querySelector('#weeklyCaloriesChart')) {
      this.initializeWeeklyCaloriesChart()
    }
    if (this.el.querySelector('#macronutrientChart')) {
      this.initializeMacronutrientChart()
    }
    if (this.el.querySelector('#mealDistributionChart')) {
      this.initializeMealDistributionChart()
    }
  },

  getThemeConfig() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    return {
      theme: "light1", // Use light1 for better custom control
      backgroundColor: "transparent",
      titleFontColor: isDark ? "#e2e8f0" : "#1e293b",
      labelFontColor: isDark ? "#cdd6f4" : "#cdd6f4",
      lineColor: isDark ? "#cbd5e1" : "#475569",
      tickColor: isDark ? "#cbd5e1" : "#475569",
      gridColor: isDark ? "#cbd5e1" : "#475569"
    }
  },

  initializeWeightChart() {
    const chartContainer = this.el.querySelector('#weightChart')
    if (!chartContainer) return

    const weightData = this.el.getAttribute('data-weight-entries')
    if (!weightData) return

    try {
      const entries = JSON.parse(weightData)
      const dataPoints = entries.map(entry => ({
        x: new Date(entry.entry_date + 'T00:00:00'),
        y: parseFloat(entry.weight),
        unit: entry.unit
      }))

      // Get the unit from the first entry (all should be the same now)
      const unit = dataPoints.length > 0 ? dataPoints[0].unit : 'kg'

      const themeConfig = this.getThemeConfig()

      const chart = new CanvasJS.Chart("weightChart", {
        animationEnabled: true,
        theme: themeConfig.theme,
        backgroundColor: themeConfig.backgroundColor,
        title: {
          text: "",
          fontSize: 14,
          fontFamily: "inherit",
          fontColor: themeConfig.titleFontColor
        },
        axisX: {
          valueFormatString: "MMM DD",
          labelFontSize: 11,
          titleFontColor: themeConfig.titleFontColor,
          labelFontColor: themeConfig.labelFontColor,
          lineColor: themeConfig.lineColor,
          tickColor: themeConfig.tickColor,
          gridColor: themeConfig.gridColor,
          gridThickness: 1,
          interval: 1,
          intervalType: "day",
          labelAngle: 0,
          labelMaxWidth: 60,
          labelWrap: true,
          viewportMinimum: dataPoints.length > 0 ? new Date(dataPoints[0].x.getTime() - 24 * 60 * 60 * 1000) : null,
          viewportMaximum: dataPoints.length > 0 ? new Date(dataPoints[dataPoints.length - 1].x.getTime() + 24 * 60 * 60 * 1000) : null
        },
        axisY: {
          labelFontSize: 11,
          includeZero: false,
          title: `Weight (${unit})`,
          titleFontSize: 12,
          titleFontColor: themeConfig.titleFontColor,
          labelFontColor: themeConfig.labelFontColor,
          lineColor: themeConfig.lineColor,
          tickColor: themeConfig.tickColor,
          gridColor: themeConfig.gridColor,
          gridThickness: 1,
          suffix: ` ${unit}`
        },
        data: [{
          type: "line",
          dataPoints: dataPoints,
          color: "#8b5cf6",
          lineThickness: 3,
          markerType: "circle",
          markerSize: 8,
          markerColor: "#8b5cf6",
          markerBorderColor: "#a855f7",
          markerBorderThickness: 2
        }],
        backgroundColor: themeConfig.backgroundColor
      })

      chart.render()
    } catch (error) {
      console.error('Error initializing weight chart:', error)
    }
  },

  initializeWeeklyCaloriesChart() {
    const chartContainer = this.el.querySelector('#weeklyCaloriesChart')
    if (!chartContainer) return

    const nutritionData = this.el.getAttribute('data-weekly-nutrition')
    if (!nutritionData) return

    try {
      const data = JSON.parse(nutritionData)
      const dataPoints = data.daily_summaries.map(summary => ({
        x: new Date(summary.date),
        y: parseFloat(summary.calories) || 0
      }))

      const themeConfig = this.getThemeConfig()

      const chart = new CanvasJS.Chart("weeklyCaloriesChart", {
        animationEnabled: true,
        theme: themeConfig.theme,
        backgroundColor: themeConfig.backgroundColor,
        title: {
          text: "",
          fontSize: 14,
          fontFamily: "inherit",
          fontColor: themeConfig.titleFontColor
        },
        axisX: {
          valueFormatString: "DDD",
          labelFontSize: 11,
          titleFontColor: themeConfig.titleFontColor,
          labelFontColor: themeConfig.labelFontColor,
          lineColor: themeConfig.lineColor,
          tickColor: themeConfig.tickColor,
          gridColor: themeConfig.gridColor,
          gridThickness: 1
        },
        axisY: {
          labelFontSize: 11,
          titleFontColor: themeConfig.titleFontColor,
          labelFontColor: themeConfig.labelFontColor,
          lineColor: themeConfig.lineColor,
          tickColor: themeConfig.tickColor,
          gridColor: themeConfig.gridColor,
          gridThickness: 1
        },
        data: [{
          type: "column",
          dataPoints: dataPoints,
          color: "#06d6a0",
          borderColor: "#059669",
          borderThickness: 1
        }],
        backgroundColor: themeConfig.backgroundColor
      })

      chart.render()
    } catch (error) {
      console.error('Error initializing weekly calories chart:', error)
    }
  },

  initializeMacronutrientChart() {
    const chartContainer = this.el.querySelector('#macronutrientChart')
    if (!chartContainer) return

    const macroData = this.el.getAttribute('data-macronutrient-breakdown')
    if (!macroData) return

    try {
      const data = JSON.parse(macroData)
      const protein = parseFloat(data.protein) || 0
      const carbs = parseFloat(data.carbs) || 0
      const fat = parseFloat(data.fat) || 0

      if (protein === 0 && carbs === 0 && fat === 0) {
        chartContainer.innerHTML = '<div class="flex items-center justify-center h-full text-base-content/70"><p>No nutrition data for today</p></div>'
        return
      }

      const dataPoints = [
        { y: protein, name: "Protein", color: "#8b5cf6", exploded: false },
        { y: carbs, name: "Carbs", color: "#06d6a0", exploded: false },
        { y: fat, name: "Fat", color: "#f59e0b", exploded: false }
      ]

      const themeConfig = this.getThemeConfig()

      const chart = new CanvasJS.Chart("macronutrientChart", {
        animationEnabled: true,
        theme: themeConfig.theme,
        backgroundColor: themeConfig.backgroundColor,
        title: {
          text: "",
          fontSize: 14,
          fontFamily: "inherit",
          fontColor: themeConfig.titleFontColor
        },
        data: [{
          type: "pie",
          dataPoints: dataPoints,
          indexLabel: "{name}: {y}g",
          indexLabelFontSize: 11,
          indexLabelFontColor: themeConfig.labelFontColor,
          indexLabelPlacement: "outside",
          startAngle: -90,
          borderThickness: 2,
          borderColor: themeConfig.lineColor
        }],
        backgroundColor: themeConfig.backgroundColor
      })

      chart.render()
    } catch (error) {
      console.error('Error initializing macronutrient chart:', error)
    }
  },

  initializeMealDistributionChart() {
    const chartContainer = this.el.querySelector('#mealDistributionChart')
    if (!chartContainer) return

    const mealData = this.el.getAttribute('data-meal-distribution')
    if (!mealData) return

    try {
      const data = JSON.parse(mealData)

      if (data.length === 0) {
        chartContainer.innerHTML = '<div class="flex items-center justify-center h-full text-base-content/70"><p>No meals logged today</p></div>'
        return
      }

      const mealColors = {
        breakfast: "#8b5cf6",
        lunch: "#06d6a0",
        dinner: "#f59e0b",
        snack: "#ef4444"
      }

      const dataPoints = data.map(meal => ({
        y: parseFloat(meal.calories) || 0,
        name: meal.meal_type.charAt(0).toUpperCase() + meal.meal_type.slice(1),
        color: mealColors[meal.meal_type] || "#64748b",
        exploded: false
      }))

      const themeConfig = this.getThemeConfig()

      const chart = new CanvasJS.Chart("mealDistributionChart", {
        animationEnabled: true,
        theme: themeConfig.theme,
        backgroundColor: themeConfig.backgroundColor,
        title: {
          text: "",
          fontSize: 14,
          fontFamily: "inherit",
          fontColor: themeConfig.titleFontColor
        },
        data: [{
          type: "doughnut",
          dataPoints: dataPoints,
          indexLabel: "{name}: {y}",
          indexLabelFontSize: 11,
          indexLabelFontColor: themeConfig.labelFontColor,
          indexLabelPlacement: "outside",
          startAngle: -90,
          innerRadius: "40%",
          borderThickness: 2,
          borderColor: themeConfig.lineColor
        }],
        backgroundColor: themeConfig.backgroundColor
      })

      chart.render()
    } catch (error) {
      console.error('Error initializing meal distribution chart:', error)
    }
  }
}

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: {
    ActivityForm: ActivityFormHook,
    DatePicker: DatePickerHook,
    WeightForm: WeightFormHook,
    TimezoneData: TimezoneDataHook,
    GroceryItemForm: GroceryItemFormHook,
    DashboardChart: DashboardChartHook
  }
})

// Progress bar configuration for live navigation and form submissions
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// Connect to LiveView socket
liveSocket.connect()

// Expose liveSocket globally for debugging and latency simulation
window.liveSocket = liveSocket

// Development features for Phoenix LiveReload
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({ detail: reloader }) => {
    // Enable server log streaming to browser console
    reloader.enableServerLogs()

    // Editor integration for clicking elements
    // Press 'c' to open at caller location, 'd' to open at component definition
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", e => keyDown = null)
    window.addEventListener("click", e => {
      if (keyDown === "c") {
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if (keyDown === "d") {
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}
