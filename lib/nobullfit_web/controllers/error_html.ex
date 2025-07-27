defmodule NobullfitWeb.ErrorHTML do
  @moduledoc """
  Error page rendering for HTML requests.
  """

  use NobullfitWeb, :html

  def render(template, _assigns) do
    Phoenix.Controller.status_message_from_template(template)
  end
end
