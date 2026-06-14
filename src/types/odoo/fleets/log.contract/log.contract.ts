export interface OdooFleetVehicleLogContract {
  id: number
  activity_ids: number[]
  activity_state: string
  activity_user_id: [number, string] | false | null
  activity_type_id: [number, string] | false | null
  activity_type_icon: string | false | null
  activity_date_deadline: string | false | null
  my_activity_date_deadline: string | false | null
  activity_summary: string | false | null
  activity_exception_decoration: string | false | null
  activity_exception_icon: string | false | null
  activity_calendar_event_id: number | false | null
  message_is_follower: boolean
  message_follower_ids: number[]
  message_partner_ids: number[]
  message_ids: number[]
  has_message: boolean
  message_needaction: boolean
  message_needaction_counter: number
  message_has_error: boolean
  message_has_error_counter: number
  message_attachment_count: number
  rating_ids: number[]
  website_message_ids: number[]
  message_has_sms_error: boolean
  vehicle_id: [number, string] | false | null
  cost_subtype_id: [number, string] | false | null
  amount: number
  date: string | false | null
  company_id: [number, string] | false | null
  currency_id: [number, string] | false | null
  name: string
  active: boolean
  user_id: [number, string] | false | null
  start_date: string | false | null
  expiration_date: string | false | null
  days_left: number
  expires_today: boolean
  has_open_contract: boolean
  insurer_id: [number, string] | false | null
  purchaser_id: [number, string] | false | null
  ins_ref: string | false | null
  state: string
  notes: string | false | null
  cost_generated: number
  cost_frequency: string | false | null
  service_ids: number[]
  display_name: string
  create_uid: [number, string] | false | null
  create_date: string | false | null
  write_uid: [number, string] | false | null
  write_date: string | false | null
  purchaser_employee_id: [number, string] | false | null
  x_studio_many2one_field_8f9_1jgnqnl1l: [number, string] | false | null
  x_studio_numero_de_chasis_de_la_unidad: string | false | null
  x_studio_date_field_43a_1j63hd5ea: string | false | null
  x_studio_fecha_de_finalizacin_de_contrato: string | false | null
}
