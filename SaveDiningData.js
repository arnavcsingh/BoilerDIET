const PurdueDiningScraper = require('./PurdueDiningScraper');
const schedule = require('node-schedule');
const mysql = require('mysql');

class SaveDiningData {
    constructor() {
        this.diningSchedule = {
            'Hillenbrand': {
                'Monday': [ 'Lunch', 'Late Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Friday': [],
                'Saturday': [],
                'Sunday': ['Brunch']
            },
            'Earhart': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Windsor': {
                'Monday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Tuesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Wednesday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Thursday': ['Lunch', 'Late Lunch', 'Dinner'],
                'Friday': ['Lunch', 'Late Lunch'],
                'Saturday': ['Late Lunch', 'Dinner'],
                'Sunday': ['Lunch', 'Dinner']
            },
            'Wiley': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Lunch', 'Dinner'],
                'Sunday': ['Dinner']
            },
            'Ford': {
                'Monday': ['Breakfast', 'Lunch', 'Dinner'],
                'Tuesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Wednesday': ['Breakfast', 'Lunch', 'Dinner'],
                'Thursday': ['Breakfast', 'Lunch', 'Dinner'],
                'Friday': ['Breakfast', 'Lunch', 'Dinner'],
                'Saturday': ['Breakfast', 'Lunch'],
                'Sunday': ['Breakfast', 'Lunch', 'Dinner']
            }
        };
    }

    async saveCurrentMenu() {
        const scraper = new PurdueDiningScraper();
        for (const diningCourt in this.diningSchedule) {
            for (const mealType in diningCourt) {
                const result = await scraper.getMenu(diningCourt, mealType, new Date());
                if (result.error) throw error;
                this.saveMenu(diningCourt, mealType, result.items);
            }
        }
    }

    saveMenu(diningCourt, mealType, items) {
        let con = mysql.createConnection({
            host: "localhost",
            user: "yourusername",
            password: "yourpassword"
        });

        con.connect(function(error) {
            if (error) throw error;
        });

        /* Todo: next week, saving menu and item data to sql database */
    }
}

const saver = new SaveDiningData();

// Schedule daily at midnight
schedule.scheduleJob('0 0 * * *', async () => {
    try {
        await saver.saveCurrentMenu();
    } catch (error) {
        console.error('Scheduled save error:', error.message);
    }
});

(async () => {
  const scraper = new PurdueDiningScraper();

  const result = await scraper.getMenu('Windsor', 'Late Lunch', new Date());
  console.log(JSON.stringify(result, null, 2));
})();