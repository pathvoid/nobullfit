const ResetProgressionHook = {
  mounted() {
    this.handleEvent("show_reset_modal", () => {
      const modal = document.getElementById("reset-progression-modal");
      if (modal) {
        modal.showModal();
      }
    });
  }
};

export default ResetProgressionHook;
