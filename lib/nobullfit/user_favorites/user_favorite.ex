defmodule Nobullfit.UserFavorites.UserFavorite do
  use Ecto.Schema
  import Ecto.Changeset

  schema "user_favorites" do
    field :favorite_type, :string
    field :external_id, :string
    field :name, :string
    field :calories, :integer
    field :protein, :decimal
    field :carbs, :decimal
    field :fat, :decimal
    field :image_url, :string
    field :external_url, :string
    field :image_data, :binary
    field :image_content_type, :string
    field :diet_labels, {:array, :string}
    field :health_labels, {:array, :string}
    field :measure_uri, :string
    field :quantity, :integer, default: 100
    field :serving_sizes, {:array, :map}
    field :measures, {:array, :map}
    field :yield, :integer
    field :recipe_data, :map

    belongs_to :user, Nobullfit.Accounts.User

    timestamps()
  end

  @doc false
  def changeset(user_favorite, attrs) do
    user_favorite
    |> cast(attrs, [
      :favorite_type,
      :external_id,
      :name,
      :calories,
      :protein,
      :carbs,
      :fat,
      :image_url,
      :external_url,
      :image_data,
      :image_content_type,
      :diet_labels,
      :health_labels,
      :measure_uri,
      :quantity,
      :serving_sizes,
      :measures,
      :yield,
      :recipe_data,
      :user_id
    ])
    |> validate_required([:favorite_type, :external_id, :name, :user_id])
    |> validate_inclusion(:favorite_type, ["food", "recipe"])
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:user_id, :favorite_type, :external_id, :name], name: :user_favorites_unique_index)
  end
end
