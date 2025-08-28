defmodule NobullfitWeb.Components.ArticleContent do
  use Phoenix.Component
  import Phoenix.HTML

  # Process article content to add responsive image styles
  defp process_article_content(content) do
    content
    |> String.replace(~r/<img([^>]*?)>/i, fn match ->
      # Remove any existing width, height, and style attributes
      cleaned_attrs = match
      |> String.replace(~r/\s*width\s*=\s*["'][^"']*["']/, "")
      |> String.replace(~r/\s*height\s*=\s*["'][^"']*["']/, "")
      |> String.replace(~r/\s*style\s*=\s*["'][^"']*["']/, "")
      |> String.replace(~r/\s*class\s*=\s*["'][^"']*["']/, "")

      # Add our responsive styles with more restrictive sizing
      cleaned_attrs
      |> String.replace(">", " style=\"max-width: 100%; max-height: 200px; width: auto; height: auto; border-radius: 0.5rem; margin: 1rem auto; display: block; object-fit: contain;\">")
    end)
  end

  # Renders the content of an article, including excerpt, main content, and a key takeaway alert.
  def render_content(assigns) do
    ~H"""
    <div class="space-y-8">
      <%= if @article.excerpt do %>
        <p class="text-base-content/80 leading-relaxed text-lg">
          <%= @article.excerpt %>
        </p>
      <% end %>

      <div class="space-y-8 article-content">
        <%= raw(process_article_content(@article.content)) %>
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
