export interface OdooFleetVehicle {
  id: number
  name: string
  license_plate: string
  vin_sn: string
  model_id: [number, string]
  brand_id: [number, string]
  driver_id: [number, string] | false | null
  state_id: [number, string] | false | null
  location: string | null
  seats: number
  doors: number
  color: string | false | null
  model_year: string | null
  acquisition_date: string | null
  first_contract_date: string | null
  odometer: number
  odometer_unit: string | null
  fuel_type: string | false | null
  horsepower: number
  horsepower_tax: number
  power: number
  co2: number
  company_id: [number, string]
  active: boolean
  car_value: number | null
  residual_value: number | null
  plan_to_change_car: boolean | null
  x_studio_nombre_del_usuario: string | null
}
