export interface User {
  id: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Credential {
  id: string
  category_id: string
  category?: Category
  name: string
  database_name: string | null
  description: string | null
  tags: string[]
  credential_fields?: Record<string, Record<string, string>>
  is_deleted: boolean
  created_at: string
  created_by?: User
  updated_at: string
  updated_by?: User
}

export interface CredentialCreateRequest {
  category_id: string
  name: string
  database_name?: string
  description?: string
  tags?: string[]
  credential_fields: Record<string, Record<string, string>>
}

export interface CredentialUpdateRequest {
  category_id?: string
  name?: string
  database_name?: string
  description?: string
  tags?: string[]
  credential_fields?: Record<string, Record<string, string>>
}

export interface AuditLog {
  id: string
  user_id: string | null
  user?: User
  action: string
  resource_type: string
  resource_id: string
  change_summary: string
  old_value: string | null
  new_value: string | null
  ip_address: string
  user_agent: string
  status: 'SUCCESS' | 'FAILURE'
  error_message: string | null
  created_at: string
}

export interface WhitelistEmail {
  id: string
  email: string
  is_active: boolean
  created_at: string
  created_by_user_id: string
  notes: string | null
  created_by?: User
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: string
}
