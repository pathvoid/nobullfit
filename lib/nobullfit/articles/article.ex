defmodule Nobullfit.Articles.Article do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  schema "articles" do
    field :title, :string
    field :slug, :string
    field :excerpt, :string
    field :content, :string
    field :author, :string
    field :author_avatar, :string
    field :featured, :boolean, default: false
    field :active, :boolean, default: true
    field :published_at, :utc_datetime
    field :meta_title, :string
    field :meta_description, :string

    timestamps()
  end

  @doc false
  def changeset(article, attrs) do
    article
    |> cast(attrs, [
      :title,
      :slug,
      :excerpt,
      :content,
      :author,
      :author_avatar,
      :featured,
      :active,
      :published_at,
      :meta_title,
      :meta_description
    ])
    |> validate_required([:title, :slug, :content])
    |> unique_constraint(:slug)
    |> validate_content_format()
  end

  defp validate_content_format(changeset) do
    case get_change(changeset, :content) do
      nil ->
        changeset

      content ->
        # Basic validation to ensure content has proper structure
        if String.contains?(content, ["<h3", "<p", "<img"]) do
          changeset
        else
          add_error(changeset, :content, "Content must include proper HTML structure")
        end
    end
  end

  # Query functions

  def featured_article do
    from(a in __MODULE__,
      where: a.featured == true and a.active == true,
      order_by: [desc: a.inserted_at],
      limit: 1
    )
  end

  def active_articles do
    from(a in __MODULE__,
      where: a.active == true,
      order_by: [desc: a.inserted_at]
    )
  end

  def random_articles(exclude_id, limit \\ 4) do
    from(a in __MODULE__,
      where: a.active == true and a.id != ^exclude_id,
      order_by: fragment("RANDOM()"),
      limit: ^limit
    )
  end

  def by_slug(slug) do
    from(a in __MODULE__,
      where: a.slug == ^slug and a.active == true
    )
  end
end
