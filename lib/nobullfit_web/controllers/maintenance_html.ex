defmodule NobullfitWeb.MaintenanceHTML do
  use NobullfitWeb, :html
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Components.MaintenanceBanner, only: [maintenance_banner: 1]

  embed_templates "maintenance_html/*"
end
