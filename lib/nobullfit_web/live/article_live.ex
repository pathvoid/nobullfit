defmodule NobullfitWeb.ArticleLive do
  use NobullfitWeb, :live_view
  import NobullfitWeb.Components.Navigation, only: [navigation: 1, footer: 1]
  import NobullfitWeb.Layouts, only: [flash_group: 1]
  import NobullfitWeb.Components.ArticleContent, only: [render_content: 1]
  alias Nobullfit.Articles

  on_mount {NobullfitWeb.UserAuth, :mount_current_scope}

  # Render the main blog page or an individual article
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-100 flex flex-col">
      <.navigation current_scope={@current_scope} current_path={@current_path} maintenance_status={@maintenance_status} user_agent={@user_agent} />

      <main class="container mx-auto px-4 py-8 md:py-12 flex-1">
        <!-- Hero Section -->
        <div class="text-center mb-16">
          <h1 class="text-5xl font-bold mb-6">NoBullFit Blog</h1>
          <p class="text-xl text-base-content/70 max-w-2xl mx-auto">
            Real talk about fitness, nutrition, and getting results without the BS.
            No fads, no magic pills—just science-backed strategies that actually work.
          </p>
        </div>

        <!-- Main Content Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Article Content - Left Column -->
          <div class="lg:col-span-2">
            <%= if @article do %>
              <!-- Individual Article -->
              <article class="bg-base-200 rounded-lg p-8 shadow-xl">
                <div class="flex items-center gap-4 mb-6">
                  <div class="avatar">
                    <div class="w-12 h-12 rounded-full">
                      <img src={@article.author_avatar} alt={@article.author} />
                    </div>
                  </div>
                  <div>
                    <h3 class="font-semibold"><%= @article.author %></h3>
                    <p class="text-sm text-base-content/60">
                      <%= Calendar.strftime(@article.inserted_at, "%B %Y") %>
                    </p>
                  </div>
                </div>

                <h2 class="text-3xl font-bold mb-6"><%= @article.title %></h2>

                <.render_content article={@article} />
              </article>
            <% else %>
              <!-- Featured Article on Main Page -->
              <%= if @featured_article do %>
                <article class="bg-base-200 rounded-lg p-8 shadow-xl">
                  <div class="flex items-center gap-4 mb-6">
                    <div class="avatar">
                      <div class="w-12 h-12 rounded-full">
                        <img src={@featured_article.author_avatar} alt={@featured_article.author} />
                      </div>
                    </div>
                    <div>
                      <h3 class="font-semibold"><%= @featured_article.author %></h3>
                      <p class="text-sm text-base-content/60">
                        <%= Calendar.strftime(@featured_article.inserted_at, "%B %Y") %>
                      </p>
                    </div>
                  </div>

                  <h2 class="text-3xl font-bold mb-6"><%= @featured_article.title %></h2>

                  <.render_content article={@featured_article} />
                </article>
              <% else %>
                <div class="bg-base-200 rounded-lg p-8 shadow-xl text-center">
                  <h2 class="text-2xl font-bold mb-4">No Featured Article</h2>
                  <p class="text-base-content/70">No featured article is currently set.</p>
                </div>
              <% end %>
            <% end %>
          </div>

          <!-- Sidebar Articles - Right Column -->
          <div class="lg:col-span-1">
            <h3 class="text-xl font-semibold mb-6">More Articles</h3>
            <div class="space-y-6">
              <%= for article <- @random_articles do %>
                <article class="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow">
                  <div class="card-body p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="avatar">
                        <div class="w-8 h-8 rounded-full">
                          <img src={article.author_avatar} alt={article.author} />
                        </div>
                      </div>
                      <div>
                        <h4 class="font-medium text-sm"><%= article.author %></h4>
                        <p class="text-xs text-base-content/60">
                          <%= Calendar.strftime(article.inserted_at, "%B %Y") %>
                        </p>
                      </div>
                    </div>

                    <h3 class="card-title text-base mb-2">
                      <a href={"/guides/#{article.slug}"} class="hover:text-primary transition-colors">
                        <%= article.title %>
                      </a>
                    </h3>
                    <p class="text-base-content/70 text-sm mb-3">
                      <%= article.excerpt || String.slice(article.content, 0, 120) <> "..." %>
                    </p>

                    <div class="card-actions justify-end">
                      <a href={"/guides/#{article.slug}"} class="btn btn-primary btn-sm">Read More</a>
                    </div>
                  </div>
                </article>
              <% end %>
            </div>
          </div>
        </div>
      </main>

      <.footer current_path={@current_path} />
      <.flash_group flash={@flash} />
    </div>
    """
  end

  # Handle main guides page (no slug)
  def mount(params, session, socket) when not is_map_key(params, "slug") do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_agent = Map.get(session, "user_agent", "") || Map.get(session, :user_agent, "")

    featured_article = Articles.get_featured_article()
    random_articles =
      if featured_article do
        Articles.get_random_articles(featured_article.id, 4)
      else
        Articles.list_articles() |> Enum.take(4)
      end

    {:ok,
     assign(socket,
       current_path: "/guides",
       maintenance_status: maintenance_status,
       user_agent: user_agent,
       article: nil,
       featured_article: featured_article,
       random_articles: random_articles
     )}
  end

  # Handle individual article page (with slug)
  def mount(%{"slug" => slug}, session, socket) do
    maintenance_status = Map.get(session, "maintenance_status", %{enabled: false})
    user_agent = Map.get(session, "user_agent", "") || Map.get(session, :user_agent, "")

    article = Articles.get_article_by_slug(slug)
    random_articles =
      if article do
        Articles.get_random_articles(article.id, 4)
      else
        Articles.list_articles() |> Enum.take(4)
      end

    {:ok,
     assign(socket,
       current_path: "/guides/#{slug}",
       maintenance_status: maintenance_status,
       user_agent: user_agent,
       article: article,
       featured_article: nil,
       random_articles: random_articles
     )}
  end
end
