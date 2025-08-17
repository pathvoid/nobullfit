defmodule NobullfitWeb.ImageController do
  use NobullfitWeb, :controller

  alias Nobullfit.UserFavorites

  # Serves the image data for a user favorite by ID, if available.
  def show(conn, %{"id" => id}) do
    case UserFavorites.get_user_favorite!(id, conn.assigns.current_scope.user.id) do
      %{image_data: image_data, image_content_type: content_type} when not is_nil(image_data) ->
        conn
        |> put_resp_content_type(content_type)
        |> put_resp_header("cache-control", "public, max-age=31536000") # Cache for 1 year
        |> send_resp(200, image_data)

      _ ->
        conn
        |> put_status(:not_found)
        |> text("Image not found")
    end
  end
end
