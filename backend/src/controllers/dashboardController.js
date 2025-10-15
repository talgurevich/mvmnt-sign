// Dashboard Controller
// Provides statistics and recent activity for admin dashboard

const { supabaseAdmin } = require('../config/supabase')
const { catchAsync, AppError } = require('../middleware/errorHandler')

// Get dashboard statistics
exports.getDashboardStats = catchAsync(async (req, res) => {
  // Get total customers
  const { count: totalCustomers } = await supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  // Get active customers
  const { count: activeCustomers } = await supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('is_active', true)

  // Get total templates
  const { count: totalTemplates } = await supabaseAdmin
    .from('form_templates')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  // Get active templates
  const { count: activeTemplates } = await supabaseAdmin
    .from('form_templates')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('is_active', true)

  // Get form requests by status
  const { data: formRequests } = await supabaseAdmin
    .from('form_requests')
    .select('status')

  const formRequestStats = {
    total: formRequests?.length || 0,
    pending: formRequests?.filter(r => r.status === 'pending').length || 0,
    viewed: formRequests?.filter(r => r.status === 'viewed').length || 0,
    signed: formRequests?.filter(r => r.status === 'signed').length || 0,
    expired: formRequests?.filter(r => r.status === 'expired').length || 0
  }

  // Get signed documents count
  const { count: signedDocuments } = await supabaseAdmin
    .from('signed_documents')
    .select('*', { count: 'exact', head: true })

  // Calculate signing rate
  const signingRate = formRequestStats.total > 0
    ? ((formRequestStats.signed / formRequestStats.total) * 100).toFixed(1)
    : 0

  res.json({
    customers: {
      total: totalCustomers || 0,
      active: activeCustomers || 0,
      inactive: (totalCustomers || 0) - (activeCustomers || 0)
    },
    templates: {
      total: totalTemplates || 0,
      active: activeTemplates || 0,
      inactive: (totalTemplates || 0) - (activeTemplates || 0)
    },
    formRequests: formRequestStats,
    signedDocuments: signedDocuments || 0,
    signingRate: parseFloat(signingRate)
  })
})

// Get recent activity
exports.getRecentActivity = catchAsync(async (req, res) => {
  const { limit = 20 } = req.query

  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (error) {
    console.error('Error fetching recent activity:', error)
    throw new AppError('שגיאה בטעינת פעילות אחרונה', 500)
  }

  res.json({
    data
  })
})

// Get recent form requests
exports.getRecentFormRequests = catchAsync(async (req, res) => {
  const { limit = 10, status = null } = req.query

  let query = supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      customer:customers(first_name, last_name, phone_number),
      template:form_templates(template_name)
    `)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching recent form requests:', error)
    throw new AppError('שגיאה בטעינת בקשות אחרונות', 500)
  }

  res.json({
    data
  })
})

// Get statistics by date range
exports.getStatsByDateRange = catchAsync(async (req, res) => {
  const { start_date, end_date } = req.query

  if (!start_date || !end_date) {
    throw new AppError('נדרשים תאריכי התחלה וסיום', 400)
  }

  // Get form requests in date range
  const { data: formRequests } = await supabaseAdmin
    .from('form_requests')
    .select('*')
    .gte('created_at', start_date)
    .lte('created_at', end_date)

  // Get signatures in date range
  const { data: signatures } = await supabaseAdmin
    .from('signatures')
    .select('*')
    .gte('signed_at', start_date)
    .lte('signed_at', end_date)

  // Group by date
  const statsByDate = {}

  formRequests?.forEach(request => {
    const date = request.created_at.split('T')[0]
    if (!statsByDate[date]) {
      statsByDate[date] = { sent: 0, signed: 0 }
    }
    statsByDate[date].sent += 1
  })

  signatures?.forEach(signature => {
    const date = signature.signed_at.split('T')[0]
    if (!statsByDate[date]) {
      statsByDate[date] = { sent: 0, signed: 0 }
    }
    statsByDate[date].signed += 1
  })

  // Convert to array
  const statsArray = Object.keys(statsByDate).map(date => ({
    date,
    sent: statsByDate[date].sent,
    signed: statsByDate[date].signed
  })).sort((a, b) => a.date.localeCompare(b.date))

  res.json({
    data: statsArray,
    summary: {
      totalSent: formRequests?.length || 0,
      totalSigned: signatures?.length || 0,
      signingRate: formRequests?.length > 0
        ? ((signatures?.length / formRequests?.length) * 100).toFixed(1)
        : 0
    }
  })
})

// Get top performing templates
exports.getTopTemplates = catchAsync(async (req, res) => {
  const { limit = 5 } = req.query

  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .select(`
      id,
      template_name,
      created_at,
      form_requests(id, status)
    `)
    .is('deleted_at', null)
    .limit(parseInt(limit))

  if (error) {
    console.error('Error fetching top templates:', error)
    throw new AppError('שגיאה בטעינת תבניות פופולריות', 500)
  }

  // Calculate stats for each template
  const templatesWithStats = data.map(template => ({
    id: template.id,
    template_name: template.template_name,
    created_at: template.created_at,
    totalSent: template.form_requests?.length || 0,
    totalSigned: template.form_requests?.filter(r => r.status === 'signed').length || 0,
    signingRate: template.form_requests?.length > 0
      ? ((template.form_requests.filter(r => r.status === 'signed').length / template.form_requests.length) * 100).toFixed(1)
      : 0
  }))

  // Sort by total sent
  templatesWithStats.sort((a, b) => b.totalSent - a.totalSent)

  res.json({
    data: templatesWithStats.slice(0, parseInt(limit))
  })
})

module.exports = exports
