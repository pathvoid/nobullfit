defmodule NobullfitWeb.Components.ArticleContent do
  use Phoenix.Component
  import Phoenix.HTML

  # Renders the content of an article, including excerpt, main content, and a key takeaway alert.
  def render_content(assigns) do
    ~H"""
    <div class="space-y-8">
      <%= if @article.excerpt do %>
        <p class="text-base-content/80 leading-relaxed text-lg">
          <%= @article.excerpt %>
        </p>
      <% end %>

      <div class="space-y-8">
        <%= raw(@article.content) %>
      </div>

      <div class="alert alert-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          class="stroke-current shrink-0 w-6 h-6"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <span>
          <strong>Key Takeaway:</strong>
          <%= @article.meta_description || "Stay consistent and focus on progress over perfection." %>
        </span>
      </div>
    </div>
    """
  end
end
