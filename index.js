const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const { DEFAULT_INTERCEPT_RESOLUTION_PRIORITY } = require('puppeteer')
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker')
puppeteer.use(
  AdblockerPlugin({
    interceptResolutionPriority: DEFAULT_INTERCEPT_RESOLUTION_PRIORITY
  })
)

const args = process.argv;

let lowerLimit = args[2] || 1;
lowerLimit = parseInt(lowerLimit);

let upperLimit = args[3] || 1000;
upperLimit = parseInt(upperLimit);

let district = args[4] || 'Hyderabad';

let DBhash = crypto.randomBytes(4).toString('hex');

let db = new sqlite3.Database(`./sqliteDB/${DBhash}Example.db`, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Connected to the SQLite database.');
  });

// create a table with specified columns
db.run(`CREATE TABLE IF NOT EXISTS firms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT,
    surName TEXT,
    gender TEXT,
    doorNo TEXT,
    city TEXT,
    street TEXT,
    state TEXT,
    country TEXT,
    phoneNumber TEXT,
    emailId TEXT,
    mobileNumber TEXT,
    registrationNo TEXT,
    registeredDistrict TEXT,
    registeredName TEXT,
    registeredYear TEXT,
    partners TEXT
)`, (err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Table created or already exists.');
});

  function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }

 (async () => {
    const browser = await puppeteer.launch({ headless: false }); // Launch browser in non-headless mode
    const page = await browser.newPage(); // Open a new page
    await page.goto('https://registration.telangana.gov.in/firmRegistration.htm', { 'waitUntil': 'networkidle2' }); // Replace with your website's URL

    // ---> this is where loop starts

    for(let j=2024; j>=upperLimit ; j--){
    // reg no
    for(let i=1; i<=lowerLimit ; i++){

    // wait for page to complete loading
    await page.waitForSelector('#accordion > div:nth-child(5) > div.panel-heading > h4 > a');
    // wait for 2 more seconds

    // check if this selector is present
    let isPresent = await page.evaluate(() => {
        return document.querySelector('#accordion > div:nth-child(5) > div.panel-heading > h4 > a') !== null;
    });

    if(!isPresent){
        process.exit(0);
    }
    if(isPresent){
        await page.evaluate(() => {
            document.querySelector('#collapse6 > div > a').click();
        });
        await delay(5000);
    }


    // when you click on the button, it opens a new tab
    // you need to switch to that tab
    // and then perform the actions
    const [newPage] = await Promise.all([
        new Promise((resolve) => browser.once('targetcreated', (target) => resolve(target.page()))),
        page.evaluate(() => {
            document.querySelector('#collapse6 > div > a').click();
        })
    ]);

    // wait until all the network requests are completed
    await newPage.waitForNetworkIdle();
    await delay(5000);

    // Wait for the new tab to load
    await newPage.waitForSelector('#firmRegistrationNo'); // Replace with your input field's selector

    // Fill in the input box
    await newPage.type('#firmRegistrationNo', `${i}`); // Replace with your input field's selector and text
    await newPage.type('#regYear', `${j}`);
    await newPage.select('#registrationDistrictName', district);
    
    
    // Perform more actions on the new page if needed
    await newPage.click('#Submit'); // Example of another action
    
    const result = await Promise.race([
        newPage.waitForSelector('#firmRegBean > div:nth-child(1) > div:nth-child(2) > div > table > thead > tr > th:nth-child(1) > label').then(() => 'firstSelector'),
        newPage.waitForSelector('#firmRegBean > div:nth-child(1) > div.form-grid > span').then(() => 'secondSelector')
    ]);

    if(result == 'firstSelector'){
        console.log('firstSelector');
    }
    else{
        console.log('secondSelector');
    }

    if(result == 'secondSelector'){
        // continue;
        console.log('not found');
        process.exit(0);
    }
    
    await newPage.waitForSelector('#firmRegBean > div:nth-child(1) > div:nth-child(2) > div > table > tbody > tr > td:nth-child(5) > a');

    // check if this selector is present
    isPresent = await newPage.evaluate(() => {
        return document.querySelector('#firmRegBean > div:nth-child(1) > div:nth-child(2) > div > table > tbody > tr > td:nth-child(5) > a') !== null;
    });
    if(!isPresent){
        console.log('not found');
        process.exit(0);
    }
    if(isPresent){
        console.log('found');
        await newPage.evaluate(() => {
            document.querySelector('#firmRegBean > div:nth-child(1) > div:nth-child(2) > div > table > tbody > tr > td:nth-child(5) > a').click();
        });
    }
    

    // wait for 5 seconds
    await delay(5000);
    await newPage.waitForSelector('body > section > div.container-fluid');
    
    await newPage.waitForSelector('#currentTableBodyId');
    let data = [];
    data = await newPage.evaluate(() => {
        let data = [];
        let firstNameEle = document.querySelector('#firstName');
        let surNameEle = document.querySelector('#surName1');
        let gender = document.querySelector('#gender');
        let doorNo = document.querySelector('#doorNo');
        let city = document.querySelector('#city');
        let street = document.querySelector('#street');
        let state = document.querySelector('#stateName');
        let country = document.querySelector('#countryName');

        // contact details
        let phoneNumber = document.querySelector('#phoneNumber');
        let emailId = document.querySelector('#emailId');
        let mobileNumber = document.querySelector('#mobileNumber');

        // firm details
        let registrationNo = document.querySelector('#firmRegistrationNo');
        let registeredDistrict = document.querySelector('#registrationDistrictName');
        let registeredName = document.querySelector('#firmName');
        let registeredYear = document.querySelector('#firmEndDate');


        // firm partners:
        let partnersTable = document.querySelector('#currentTableBodyId');
        let rows = partnersTable.querySelectorAll('tr');
        let partners = [];
            for (let row of rows) {
                let partner = {};
                let name = row.querySelector('td:nth-child(2)').innerText;
                let surName = row.querySelector('td:nth-child(3)').innerText;
                let age = row.querySelector('td:nth-child(4)').innerText;
                let address = row.querySelector('td:nth-child(5)').innerText;
                partner = { name, surName, age, address };
                partners.push(partner);
            }

            let object = {
                firstName: firstNameEle.value,
                surName: surNameEle.value,
                gender: gender.value,
                doorNo: doorNo.value,
                city: city.value,
                street: street.value,
                state: state.value,
                country: country.value,
                phoneNumber: phoneNumber.value,
                emailId: emailId.value,
                mobileNumber: mobileNumber.value,
                registrationNo: registrationNo.value,
                registeredDistrict: registeredDistrict.value,
                registeredName: registeredName.value,
                registeredYear: registeredYear.value,
                partners: partners
            }
            data.push(object);
            return data;
        })
        
        // inster data[0] into the table
        db.run(`INSERT INTO firms (firstName, surName, gender, doorNo, city, street, state, country, phoneNumber, emailId, mobileNumber, registrationNo, 
            registeredDistrict, registeredName, registeredYear, partners) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [data[0].firstName, data[0].surName, data[0].gender, data[0].doorNo, data[0].city, 
            data[0].street, data[0].state, data[0].country, data[0].phoneNumber, data[0].emailId, data[0].mobileNumber, data[0].registrationNo, 
            data[0].registeredDistrict, data[0].registeredName, data[0].registeredYear, JSON.stringify(data[0].partners)], 
            function(err) {
                if (err) {
                    console.error(err.message);
                }
                console.log('Data inserted.');
            }
        );

    // Close the new tab
    await newPage.close();
    // ---> this is where loop ends
    }
    }
    // Close the browser
    await browser.close();
})();