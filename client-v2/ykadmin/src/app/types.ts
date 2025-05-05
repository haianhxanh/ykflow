export interface Request {
  id: string;
  order_name: string;
  order_id: string;
  order_email: string;
  pause_start_date: Date;
  pause_end_date: Date;
  item_title: string;
  item_id: string;
  new_start_date: Date;
  new_end_date: Date;
  status: string;
  request_date: Date;
  merchant_note: string | null;
  user_note: string | null;
  created_by_id: string | null;
  updated_by_id: string;
  update_history: UpdateHistory[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHistory {
  timestamp: Date;
  updatedBy: string;
  details: string;
}
