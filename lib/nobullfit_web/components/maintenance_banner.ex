defmodule NobullfitWeb.Components.MaintenanceBanner do
  use Phoenix.Component
  import NobullfitWeb.CoreComponents

  @doc """
  Renders a maintenance banner when maintenance mode is enabled.
  """
  def maintenance_banner(assigns) do
    ~H"""
    <%= if @maintenance_status.enabled do %>
      <div class="alert alert-warning shadow-lg rounded-none">
        <div class="flex items-center gap-3">
          <.icon name="hero-exclamation-triangle" class="size-6 shrink-0" />
          <div class="flex-1">
            <p class="text-sm">
              <%= @maintenance_status.message || "We're currently performing maintenance. Please check back soon." %>
            </p>
          </div>
        </div>
      </div>
    <% end %>
    """
  end
end
