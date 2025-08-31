defmodule NobullfitWeb.Helpers.AppDetection do
  @moduledoc """
  Helper functions for detecting if the user is running the NoBullFit app.
  """

  @doc """
  Checks if the user agent contains "NBFAPP" indicating the NoBullFit app.

  ## Examples

      iex> is_nobullfit_app?("Mozilla/5.0 NBFAPP/1.0")
      true

      iex> is_nobullfit_app?("Mozilla/5.0 Chrome/91.0")
      false

      iex> is_nobullfit_app?("")
      false
  """
  def is_nobullfit_app?(user_agent) when is_binary(user_agent) do
    String.contains?(user_agent, "NBFAPP")
  end

  def is_nobullfit_app?(_), do: false

  @doc """
  Checks if the current session indicates the user is running the NoBullFit app.

  ## Examples

      iex> is_nobullfit_app_from_session?(%{"user_agent" => "NBFAPP/1.0"})
      true

      iex> is_nobullfit_app_from_session?(%{user_agent: "NBFAPP/1.0"})
      true

      iex> is_nobullfit_app_from_session?(%{"user_agent" => "Chrome/91.0"})
      false
  """
  def is_nobullfit_app_from_session?(session) when is_map(session) do
    user_agent =
      Map.get(session, "user_agent", "") ||
        Map.get(session, :user_agent, "")

    is_nobullfit_app?(user_agent)
  end

  def is_nobullfit_app_from_session?(_), do: false
end
