defmodule NobullfitWeb.MaintenanceHTML do
  use NobullfitWeb, :html
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  embed_templates "maintenance_html/*"
end
