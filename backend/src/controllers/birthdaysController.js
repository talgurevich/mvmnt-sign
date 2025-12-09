/**
 * Birthdays Controller
 * Handles upcoming birthdays for active members
 */

const arboxService = require('../services/arboxService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get upcoming birthdays for active members
 * GET /api/birthdays?days=7
 */
exports.getUpcomingBirthdays = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  console.log(`[Birthdays] Fetching birthdays for next ${days} days`);

  // Fetch all users from Arbox
  const users = await arboxService.getUsers();

  if (!Array.isArray(users)) {
    return res.json({
      success: true,
      data: [],
      total: 0
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + days);

  // Filter users with upcoming birthdays
  const upcomingBirthdays = users
    .filter(user => {
      // Check if user has a birthday
      const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
      if (!birthDate) return false;

      // Check if user is active (has active membership or status)
      const isActive = user.status === 'active' ||
                       user.isActive ||
                       user.activeMembership ||
                       (user.memberships && user.memberships.some(m => m.status === 'active'));

      if (!isActive) return false;

      // Parse birthday and check if it falls within the range
      const bday = new Date(birthDate);
      if (isNaN(bday.getTime())) return false;

      // Create this year's birthday
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

      // If birthday already passed this year, check next year
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }

      // Check if birthday falls within range
      return thisYearBday >= today && thisYearBday <= endDate;
    })
    .map(user => {
      const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
      const bday = new Date(birthDate);

      // Calculate this year's birthday
      const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYearBday < today) {
        thisYearBday.setFullYear(today.getFullYear() + 1);
      }

      // Calculate days until birthday
      const daysUntil = Math.ceil((thisYearBday - today) / (1000 * 60 * 60 * 24));

      // Calculate age they'll be turning
      const turningAge = thisYearBday.getFullYear() - bday.getFullYear();

      return {
        id: user.id,
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        fullName: `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim(),
        phone: user.phone || user.phoneNumber || '',
        email: user.email || '',
        birthDate: birthDate,
        birthdayThisYear: thisYearBday.toISOString().split('T')[0],
        daysUntil,
        turningAge,
        isToday: daysUntil === 0,
        isTomorrow: daysUntil === 1
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // Group by days until
  const todayBirthdays = upcomingBirthdays.filter(b => b.isToday);
  const tomorrowBirthdays = upcomingBirthdays.filter(b => b.isTomorrow);
  const laterBirthdays = upcomingBirthdays.filter(b => !b.isToday && !b.isTomorrow);

  console.log(`[Birthdays] Found ${upcomingBirthdays.length} upcoming birthdays`);

  res.json({
    success: true,
    dateRange: {
      from: today.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
      days
    },
    summary: {
      total: upcomingBirthdays.length,
      today: todayBirthdays.length,
      tomorrow: tomorrowBirthdays.length,
      later: laterBirthdays.length
    },
    data: {
      today: todayBirthdays,
      tomorrow: tomorrowBirthdays,
      later: laterBirthdays,
      all: upcomingBirthdays
    }
  });
});

/**
 * Get today's birthdays only (for notifications)
 * GET /api/birthdays/today
 */
exports.getTodaysBirthdays = catchAsync(async (req, res) => {
  const users = await arboxService.getUsers();

  if (!Array.isArray(users)) {
    return res.json({
      success: true,
      data: [],
      total: 0
    });
  }

  const today = new Date();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const todaysBirthdays = users
    .filter(user => {
      const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
      if (!birthDate) return false;

      const isActive = user.status === 'active' ||
                       user.isActive ||
                       user.activeMembership ||
                       (user.memberships && user.memberships.some(m => m.status === 'active'));
      if (!isActive) return false;

      const bday = new Date(birthDate);
      if (isNaN(bday.getTime())) return false;

      return bday.getMonth() === todayMonth && bday.getDate() === todayDate;
    })
    .map(user => {
      const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
      const bday = new Date(birthDate);
      const turningAge = today.getFullYear() - bday.getFullYear();

      return {
        id: user.id,
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        fullName: `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim(),
        phone: user.phone || user.phoneNumber || '',
        email: user.email || '',
        birthDate,
        turningAge
      };
    });

  res.json({
    success: true,
    date: today.toISOString().split('T')[0],
    total: todaysBirthdays.length,
    data: todaysBirthdays
  });
});
