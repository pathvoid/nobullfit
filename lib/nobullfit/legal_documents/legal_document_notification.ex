defmodule Nobullfit.LegalDocuments.LegalDocumentNotification do
  use Ecto.Schema
  import Ecto.Changeset

  schema "legal_document_notifications" do
    field :document_type, :string
    field :version, :string
    field :notified_at, :utc_datetime

    belongs_to :user, Nobullfit.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(legal_document_notification, attrs) do
    legal_document_notification
    |> cast(attrs, [:document_type, :version, :notified_at, :user_id])
    |> validate_required([:document_type, :version, :notified_at, :user_id])
    |> validate_inclusion(:document_type, ["privacy_policy", "terms_of_service"])
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:user_id, :document_type, :version])
  end
end
