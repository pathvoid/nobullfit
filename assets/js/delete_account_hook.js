const DeleteAccountHook = {
  mounted() {
    this.handleEvent("show_delete_modal", () => {
      const modal = document.getElementById("delete-account-modal");
      if (modal) {
        modal.showModal();
      }
    });
  }
};

export default DeleteAccountHook;
