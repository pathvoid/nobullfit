defmodule NobullfitWeb.PageController do
  @moduledoc """
  Controller for static pages.
  """

  use NobullfitWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
