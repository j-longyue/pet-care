const PLAN_LIMITS = {
    free: {
        ads: true,
        maxPets: 2,
        maxFeedings: 2,
        maxReminders: 2,
        maxContacts: 1,
        maxWalks: 0,
        maxBaths: 0,
        maxDailyReports: 0,
        maxMeasurements: 0,
        maxPetAccess: 0,
    },

    premium: {
        ads: false,
        maxPets: 4,
        maxFeedings: 4,
        maxReminders: 4,
        maxContacts: 2,
        maxWalks: 2,
        maxBaths: 2,
        maxDailyReports: 2,
        maxMeasurements: 2,
        maxPetAccess: 2,
        subscriptions: [
            "monthly_premium",
            "semester_premium",
            "annual_premium"
        ]
    },

    vip: {
        ads: false,
        maxPets: 400,
        maxFeedings: 20,
        maxReminders: 20,
        maxContacts: 20,
        maxWalks: 20,
        maxBaths: 20,
        maxDailyReports: 20,
        maxMeasurements: 20,
        maxPetAccess: 10,
        subscriptions: [
            "monthly_premium",
            "semester_premium",
            "annual_premium"
        ]
    }
};