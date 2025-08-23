defmodule Nobullfit.DataExport do
  @moduledoc """
  Service for exporting user data as CSV files.
  Excludes sensitive information like passwords and authentication tokens.
  """

  import Ecto.Query, warn: false
  alias Nobullfit.Repo
  alias Nobullfit.Accounts.User
  alias Nobullfit.Activities.Activity
  alias Nobullfit.WeightEntries.WeightEntry
  alias Nobullfit.FoodEntries.FoodEntry
  alias Nobullfit.GroceryLists.GroceryList
  alias Nobullfit.UserFavorites.UserFavorite

  @doc """
  Exports all user data as CSV files.
  Returns a map with CSV content for each data type.
  """
  def export_user_data(user_id) do
    user = Repo.get(User, user_id)

    %{
      user_profile: export_user_profile(user),
      activities: export_activities(user_id),
      weight_entries: export_weight_entries(user_id),
      food_entries: export_food_entries(user_id),
      grocery_lists: export_grocery_lists(user_id),
      user_favorites: export_user_favorites(user_id)
    }
  end

  @doc """
  Exports user profile information (excluding sensitive data).
  """
  def export_user_profile(user) do
    headers = ["Email", "Account Created", "Email Confirmed", "Last Updated"]

    rows = [
      [
        user.email,
        format_datetime(user.inserted_at),
        format_datetime(user.confirmed_at),
        format_datetime(user.updated_at)
      ]
    ]

    generate_csv(headers, rows)
  end

  @doc """
  Exports user activities.
  """
  def export_activities(user_id) do
    activities =
      Activity
      |> where(user_id: ^user_id)
      |> order_by([a], desc: a.activity_date, desc: a.inserted_at)
      |> Repo.all()

    headers = [
      "Date",
      "Exercise Type",
      "Duration (minutes)",
      "Calories Burned",
      "Time",
      "Notes",
      "Created"
    ]

    rows =
      Enum.map(activities, fn activity ->
        [
          format_date(activity.activity_date),
          activity.exercise_type,
          activity.duration_minutes,
          activity.calories_burned,
          format_time(activity.activity_time),
          activity.notes || "",
          format_datetime(activity.inserted_at)
        ]
      end)

    generate_csv(headers, rows)
  end

  @doc """
  Exports user weight entries.
  """
  def export_weight_entries(user_id) do
    weight_entries =
      WeightEntry
      |> where(user_id: ^user_id)
      |> order_by([w], desc: w.entry_date, desc: w.inserted_at)
      |> Repo.all()

    headers = ["Date", "Weight", "Unit", "Created"]

    rows =
      Enum.map(weight_entries, fn entry ->
        [
          format_date(entry.entry_date),
          format_decimal(entry.weight),
          entry.unit,
          format_datetime(entry.inserted_at)
        ]
      end)

    generate_csv(headers, rows)
  end

  @doc """
  Exports user food entries.
  """
  def export_food_entries(user_id) do
    food_entries =
      FoodEntry
      |> where(user_id: ^user_id)
      |> order_by([f], desc: f.entry_date, desc: f.inserted_at)
      |> Repo.all()

    headers = [
      "Date",
      "Name",
      "Meal Type",
      "Calories",
      "Protein (g)",
      "Carbs (g)",
      "Created"
    ]

    rows =
      Enum.map(food_entries, fn entry ->
        [
          format_date(entry.entry_date),
          entry.name,
          entry.meal_type,
          format_decimal(entry.calories),
          format_decimal(entry.protein),
          format_decimal(entry.carbs),
          format_datetime(entry.inserted_at)
        ]
      end)

    generate_csv(headers, rows)
  end

  @doc """
  Exports user grocery lists and items.
  """
  def export_grocery_lists(user_id) do
    grocery_lists =
      GroceryList
      |> where(user_id: ^user_id)
      |> preload(:items)
      |> order_by([g], desc: g.inserted_at)
      |> Repo.all()

    headers = [
      "List Name",
      "Description",
      "Active",
      "Item Name",
      "Quantity",
      "Completed",
      "Sort Order",
      "Created"
    ]

    rows =
      Enum.flat_map(grocery_lists, fn list ->
        if Enum.empty?(list.items) do
          # List with no items
          [
            [
              list.name,
              list.description || "",
              list.is_active,
              "",
              "",
              "",
              "",
              format_datetime(list.inserted_at)
            ]
          ]
        else
          # List with items
          Enum.map(list.items, fn item ->
            [
              list.name,
              list.description || "",
              list.is_active,
              item.name,
              item.quantity || "",
              item.is_completed,
              item.sort_order,
              format_datetime(list.inserted_at)
            ]
          end)
        end
      end)

    generate_csv(headers, rows)
  end

  @doc """
  Exports user favorites (foods and recipes).
  """
  def export_user_favorites(user_id) do
    favorites =
      UserFavorite
      |> where(user_id: ^user_id)
      |> order_by([f], [f.favorite_type, f.inserted_at])
      |> Repo.all()

    headers = [
      "Type",
      "Name",
      "External ID",
      "Calories",
      "Protein (g)",
      "Carbs (g)",
      "Fat (g)",
      "Quantity",
      "External URL",
      "Created"
    ]

    rows =
      Enum.map(favorites, fn favorite ->
        [
          favorite.favorite_type,
          favorite.name,
          favorite.external_id,
          favorite.calories || "",
          format_decimal(favorite.protein),
          format_decimal(favorite.carbs),
          format_decimal(favorite.fat),
          favorite.quantity || "",
          favorite.external_url || "",
          format_datetime(favorite.inserted_at)
        ]
      end)

    generate_csv(headers, rows)
  end

  @doc """
  Creates a ZIP file containing all CSV exports.
  Returns the ZIP file content as binary.
  """
  def create_export_zip(user_id) do
    data = export_user_data(user_id)

    # Prepare CSV files for ZIP creation
    csv_files = [
      {"user_profile.csv", data.user_profile},
      {"activities.csv", data.activities},
      {"weight_entries.csv", data.weight_entries},
      {"food_entries.csv", data.food_entries},
      {"grocery_lists.csv", data.grocery_lists},
      {"favorites.csv", data.user_favorites}
    ]

    # Use erlang's zip module to create the archive in memory
    zip_entries =
      Enum.map(csv_files, fn {filename, content} ->
        {String.to_charlist(filename), content}
      end)

    case :zip.create(~c"nobullfit_export.zip", zip_entries, [:memory]) do
      {:ok, {_zip_name, zip_binary}} ->
        {:ok, zip_binary}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # Private helper functions

  defp generate_csv(headers, rows) do
    csv_content =
      [headers | rows]
      |> Enum.map(&escape_csv_row/1)
      |> Enum.join("\n")

    csv_content
  end

  defp escape_csv_row(row) do
    row
    |> Enum.map(&escape_csv_field/1)
    |> Enum.join(",")
  end

  defp escape_csv_field(field) when is_binary(field) do
    if String.contains?(field, [",", "\"", "\n"]) do
      "\"#{String.replace(field, "\"", "\"\"")}\""
    else
      field
    end
  end

  defp escape_csv_field(field) when is_boolean(field) do
    if field, do: "Yes", else: "No"
  end

  defp escape_csv_field(field) when is_nil(field) do
    ""
  end

  defp escape_csv_field(field) do
    to_string(field)
  end

  defp format_date(date) when is_struct(date, Date) do
    Date.to_string(date)
  end

  defp format_date(_), do: ""

  defp format_time(time) when is_struct(time, Time) do
    Time.to_string(time)
  end

  defp format_time(_), do: ""

  defp format_datetime(datetime) when is_struct(datetime, DateTime) do
    Calendar.strftime(datetime, "%Y-%m-%d %H:%M:%S UTC")
  end

  defp format_datetime(_), do: ""

  defp format_decimal(decimal) when is_struct(decimal, Decimal) do
    Decimal.round(decimal, 2) |> Decimal.to_string()
  end

  defp format_decimal(_), do: ""
end
