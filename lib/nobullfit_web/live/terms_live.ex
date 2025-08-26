defmodule NobullfitWeb.TermsLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  @impl true
  def mount(_params, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})

    # Read terms of service from markdown file
    case Nobullfit.LegalDocuments.read_document("terms_of_service") do
      {:ok, content} ->
        html_content = Nobullfit.LegalDocuments.markdown_to_html(content)
        {:ok, assign(socket,
          page_title: "Terms of Service",
          current_path: "/terms",
          maintenance_status: maintenance_status,
          content: html_content
        )}
      {:error, _} ->
        # Fallback to hardcoded content if file not found
        {:ok, assign(socket,
          page_title: "Terms of Service",
          current_path: "/terms",
          maintenance_status: maintenance_status,
          content: nil
        )}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} />

      <main class="container mx-auto px-4 py-8 md:py-24 flex-1">
        <div class="max-w-4xl mx-auto space-y-12">
          <%= if @content do %>
            <div class="prose prose-lg max-w-none">
              <%= Phoenix.HTML.raw(@content) %>
            </div>
          <% end %>
        </div>
      </main>

      <.footer current_path={@current_path} />
    </div>
    """
  end
end
