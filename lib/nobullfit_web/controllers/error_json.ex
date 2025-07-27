defmodule NobullfitWeb.ErrorJSON do
  @moduledoc """
  Error response rendering for JSON requests.
  """

  def render(template, _assigns) do
    %{errors: %{detail: Phoenix.Controller.status_message_from_template(template)}}
  end
end
