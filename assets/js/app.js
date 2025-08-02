import "phoenix_html"
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
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
      this.pushEvent("timezone-data", window.timezoneData);
    }
  }
}

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: {
    ActivityForm: ActivityFormHook,
    DatePicker: DatePickerHook,
    WeightForm: WeightFormHook,
    TimezoneData: TimezoneDataHook
  }
})

// Progress bar configuration for live navigation and form submissions
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// Connect to LiveView socket
liveSocket.connect()

// Expose liveSocket globally for debugging and latency simulation
window.liveSocket = liveSocket

// Development features for Phoenix LiveReload
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({detail: reloader}) => {
    // Enable server log streaming to browser console
    reloader.enableServerLogs()

    // Editor integration for clicking elements
    // Press 'c' to open at caller location, 'd' to open at component definition
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", e => keyDown = null)
    window.addEventListener("click", e => {
      if(keyDown === "c"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if(keyDown === "d"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}

