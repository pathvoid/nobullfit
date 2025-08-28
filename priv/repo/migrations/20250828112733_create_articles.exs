defmodule Nobullfit.Repo.Migrations.CreateArticles do
  use Ecto.Migration

  def change do
    create table(:articles) do
      add :title, :string, null: false
      add :slug, :string, null: false
      add :excerpt, :text
      add :content, :text, null: false
      add :author, :string, default: "Professor Pear"
      add :author_avatar, :string, default: "https://cdn.nobull.fit/professor-pear.png"
      add :featured, :boolean, default: false
      add :active, :boolean, default: true
      add :published_at, :utc_datetime
      add :meta_title, :string
      add :meta_description, :text

      timestamps()
    end

    create unique_index(:articles, [:slug])
    create index(:articles, [:featured])
    create index(:articles, [:active])
    create index(:articles, [:published_at])
  end
end
