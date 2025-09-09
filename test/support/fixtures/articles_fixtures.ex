defmodule Nobullfit.ArticlesFixtures do
  @moduledoc """
  This module defines test fixtures for the Articles context.
  """
  alias Nobullfit.Articles

  @doc """
  Generate an article.
  """
  def article_fixture(attrs \\ %{}) do
    {:ok, article} =
      attrs
      |> Enum.into(%{
        title: "Test Article #{System.unique_integer()}",
        slug: "test-article-#{System.unique_integer()}",
        excerpt: "This is a test article excerpt",
        content: "<h3>Introduction</h3><p>This is test content for the article.</p><img src='test.jpg' alt='Test' />",
        author: "Test Author",
        author_avatar: "https://example.com/avatar.jpg",
        featured: false,
        active: true,
        published_at: DateTime.utc_now(),
        meta_title: "Test Meta Title",
        meta_description: "Test meta description"
      })
      |> Articles.create_article()

    article
  end

  @doc """
  Generate a featured article.
  """
  def featured_article_fixture(attrs \\ %{}) do
    {:ok, article} =
      attrs
      |> Enum.into(%{
        title: "Featured Article #{System.unique_integer()}",
        slug: "featured-article-#{System.unique_integer()}",
        excerpt: "This is a featured article excerpt",
        content: "<h3>Featured Content</h3><p>This is featured test content.</p><img src='featured.jpg' alt='Featured' />",
        author: "Featured Author",
        author_avatar: "https://example.com/featured-avatar.jpg",
        featured: true,
        active: true,
        published_at: DateTime.utc_now(),
        meta_title: "Featured Meta Title",
        meta_description: "Featured meta description"
      })
      |> Articles.create_article()

    article
  end
end
