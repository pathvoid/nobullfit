defmodule Nobullfit.Repo.Migrations.AddImageDataToUserFavorites do
  use Ecto.Migration

  def change do
    alter table(:user_favorites) do
      add :image_data, :binary
      add :image_content_type, :string
    end
  end
end
