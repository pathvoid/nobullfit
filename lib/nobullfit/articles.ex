defmodule Nobullfit.Articles do
  @moduledoc """
  The Articles context.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.Articles.Article

  @doc """
  Returns the list of articles.
  """
  def list_articles do
    Repo.all(Article.active_articles())
  end

  @doc """
  Gets a single article by slug.
  """
  def get_article_by_slug(slug) do
    Repo.one(Article.by_slug(slug))
  end

  @doc """
  Gets the featured article.
  """
  def get_featured_article do
    Repo.one(Article.featured_article())
  end

  @doc """
  Gets random articles excluding the given article ID.
  """
  def get_random_articles(exclude_id, limit \\ 4) do
    Repo.all(Article.random_articles(exclude_id, limit))
  end

  @doc """
  Creates a article.
  """
  def create_article(attrs \\ %{}) do
    %Article{}
    |> Article.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a article.
  """
  def update_article(%Article{} = article, attrs) do
    article
    |> Article.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Deletes a article.
  """
  def delete_article(%Article{} = article) do
    Repo.delete(article)
  end

  @doc """
  Returns an `%Ecto.Changeset{}` for tracking article changes.
  """
  def change_article(%Article{} = article, attrs \\ %{}) do
    Article.changeset(article, attrs)
  end

  @doc """
  Sets an article as featured and unfeatures all others.
  """
  def set_featured_article(article_id) do
    Repo.transaction(fn ->
      # Unfeature all articles
      Repo.update_all(Article, set: [featured: false])

      # Feature the specified article
      Repo.update_all(
        from(a in Article, where: a.id == ^article_id),
        set: [featured: true]
      )
    end)
  end

  @doc """
  Generates a slug from a title.
  """
  def generate_slug(title) do
    title
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.replace(~r/-+/, "-")
    |> String.trim("-")
  end
end
