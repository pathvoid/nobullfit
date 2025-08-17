defmodule Nobullfit.Repo.Migrations.UpdateUserFavoritesUniqueConstraint do
  use Ecto.Migration

  def change do
    # Drop the old unique index
    drop index(:user_favorites, [:user_id, :favorite_type, :external_id], name: :user_favorites_unique_index)

    # Create new unique index that includes the name field
    create unique_index(:user_favorites, [:user_id, :favorite_type, :external_id, :name], name: :user_favorites_unique_index)
  end
end
