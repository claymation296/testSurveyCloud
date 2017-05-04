// lighting survey Parse Server cloud code

// use request.log.info() in lieu of console.log()


const utils       = require('./utilities.js');
const Mailer      = require('./mailer.js'); // https://github.com/m1gu3l/parse-sendgrid-mailer
const redaapPDF   = require('./redaappdf.js');
const private     = require('../private-credentials/private.js');
const pricingJs   = require('./pricing.js');
const bomCsv      = require('./bomcsv.js');






// sendBom: 
//        receives client and survey data as well as a signature capture
//        it saves all the data then sends out and email with an attached pdf
//        to the client along with a bcc to TEU
Parse.Cloud.define('sendBom', (request, response) => {
  const {params, user} = request;
  const {bom, client}  = params;
  // setup email generator instance
  const mailer = new Mailer(private.username, private.pw);
  let repData;
  // get a pointer to the user's company so later they may search saved surveys 
  // from other reps in that company as well
  // user.moreData is a pointer to the 'Trusted' Class row that contains the 
  // rep's company name
  const RepData      = Parse.Object.extend('Trusted');
  const repDataQuery = new Parse.Query(RepData);
  // user.moreData === Trusted.objectId
  repDataQuery.get(user.get('moreData'), {useMasterKey: true}).then(moreData => {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
                                 'before you can use this feature"}');
    }
    repData = moreData;

    return bomCsv.csvFileBuffer(bom);
  }).then(csvBuffer => {
    // rendered in email body
    const repName  = `${user.get('first')} ${user.get('last')}`;
    const repPhone = repData.get('phone');
    const repEmail = user.get('username');
    // email body
    // client === {clientName, phone, email, companyName, address, city, state, zip}
    const emailHtml = `<div>Client:</div> 
                       <div>${client.clientName}</div> 
                       <div>${client.companyName}</div>
                       <div>${client.address}</div>
                       <div>${client.city}, ${client.state} ${client.zip}</div> 
                       <div>${client.phone}</div> 
                       <div>${client.email}</div>`;
    // added to end of email body
    const footer = `<div style="margin: 32px 0px;">
                      <div>Rep:</div>
                      <div>${repName}</div>
                      <div>${repPhone}</div>
                      <div>${repEmail}</div>
                    </div>`;

    const body = emailHtml + footer;   

    return mailer.
      mail().
      // property('to',      'peterc@teulights.com').
      // property('toName',  'Peter Carpenter').
      property('to',      'claymation296@gmail.com').
      property('toName',  'Clay Bennington').




      property('from',    'RedaapBillofMaterials').
      property('subject', `${client.companyName} bill of materials`).
      property('html',     body).
      attach('bom.csv',   'text/csv', csvBuffer).
      send();

  }).then(() => {  

    const Saved = Parse.Object.extend('SavedBom');
    const saved = new Saved();


    // TODO: 
    //      make proper acl's so any rep who belongs to a particular company may edit
    //      any survey from other reps in that company for validation or follow-up purposes

    // // lock SentQuotes down so only the rep who created it may read from it in the future
    // var surveyACL = new Parse.ACL();
    // surveyACL.setReadAccess(user, true);
    // surveyACL.setWriteAccess(user, false);
    // saved.setACL(surveyACL);

    const clientKeys = Object.keys(client);
    clientKeys.forEach(key => {
      saved.set(key, client[key]);
    });

    saved.set('repCompanyName', repData.get('repCompanyName'));
    saved.set('rep',            user);
    saved.set('repFirstName',   user.get('first'));
    saved.set('repLastName',    user.get('last'));
    saved.set('bom',            bom);
    saved.set('client',         client);
     
    return saved.save();    
  }).then(() => {
    response.success('bom saved!');
  }).catch(error => {
    response.error(error);
  }); 
});






// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'save' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%

// save: 
//        receives client and survey data as well as a signature capture
//        it saves all the data then sends out and email with an attached pdf
//        to the client along with a bcc to TEU
Parse.Cloud.define('save', (request, response) => {
  const {params, user}            = request;
  const {client, pricing, survey} = params.data;
  // get a pointer to the user's company so later they may search saved surveys 
  // from other reps in that company as well
  // user.moreData is a pointer to the 'Trusted' Class row that contains the 
  // rep's company name
  const RepData      = Parse.Object.extend('Trusted');
  const repDataQuery = new Parse.Query(RepData);
  // user.moreData === Trusted.objectId
  repDataQuery.get(user.get('moreData'), {useMasterKey: true}).then(repData => {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }    

    const saveParams = {
      className: 'SavedForLater',
      client,
      pricing,
      repData,
      survey,
      user
    };

    return utils.saveSurveyData(saveParams);
  }).then(() => {
    response.success('data saved!');
  }).catch(error => {
    response.error(error);
  }); 
});




// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'review' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%


// review: 
//        receives client and survey data as well as a signature capture
//        it saves all the data then sends out and email with an attached pdf
//        to the client along with a bcc to TEU
Parse.Cloud.define('review', (request, response) => {
  const {params, user}            = request;
  const {client, pricing, survey} = params.data;
  // setup email generator instance
  const mailer = new Mailer(private.username, private.pw);
  // pdfFile is saved to Parse
  let pdfFile;
  let repData;
  let orderNum;
  let pdfUrl;

  // query the 'SalesOrder' class in order to fetch the newest sales order number
  const SalesOrder = Parse.Object.extend('SalesOrder');
  const orderQuery = new Parse.Query(SalesOrder);
  // start promise chain
  orderQuery.first({useMasterKey: true}).then(order => {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // reference the 'order' column in the SalesOrder class
    orderNum       = order.get('order');
    // increment the sales order number so it can be used for the next sale
    const orderObj = new SalesOrder();
    orderObj.id    = order.id;
    orderObj.increment('order');

    return orderObj.save(null, {useMasterKey: true});
  }).then(() => {
    // send all the data needed to create a pdf to the redaappdf.js module
    const pdfData = {user, pricing, survey, client, orderNum};
    // redaappdf.js module
    const base64  = redaapPDF.makePDF(pdfData);
    // dynamically name the file based on company name
    const pdfFileName = client.companyName.
                          replace(/\s+|\/+|\"+|\-+|\(+|\)+/g, '').
                          trim().
                          toLowerCase() +
                          '.pdf';

    pdfFile = new Parse.File(pdfFileName, {base64});
    // start async with the promise returned by Parse file save method
    return pdfFile.save();
  }).then(res => {
    // unique link to the saved pdf for email body
    pdfUrl = res._url;
    // get a pointer to the user's company so later he/she may search saved surveys 
    // from other reps in that company as well
    // user.moreData is a pointer to the 'Trusted' Class row that contains the 
    // rep's company name
    const RepData      = Parse.Object.extend('Trusted');
    const repDataQuery = new Parse.Query(RepData);
    // user.moreData === Trusted.objectId
    return repDataQuery.get(user.get('moreData'), {useMasterKey: true});
  }).then(moreData => {
    repData = moreData;

    const saveParams = {
      className: 'QuotesToReview',
      client,
      orderNum,
      pdfFile,
      pricing,
      repData,
      survey,
      user
    };

    return utils.saveSurveyData(saveParams);
  }).then(() => {
    // rendered in email body
    const repName  = `${user.get('first')} ${user.get('last')}`;
    const repPhone = repData.get('phone');
    const repEmail = user.get('username');
    // email body
    // client === {clientName, phone, email, companyName, address, city, state, zip}
    const emailHtml = `<div>Client:</div> 
                       <div>${client.clientName}</div> 
                       <div>${client.companyName}</div>
                       <div>${client.address}</div>
                       <div>${client.city}, ${client.state} ${client.zip}</div> 
                       <div>${client.phone}</div> 
                       <div>${client.email}</div>
                       <div style="margin: 32px 0px;"> 
                         <a href="${pdfUrl}">Proposal PDF</a>
                       </div>`;
    // added to end of email body
    const footer = `<div style="margin: 32px 0px;">
                      <div>Rep:</div>
                      <div>${repName}</div>
                      <div>${repPhone}</div>
                      <div>${repEmail}</div>
                    </div>`;

    const body = emailHtml + footer;   
    // create and send the email 
    return mailer.
      mail().
      property('to',      'thomas@redaap.com').
      property('toName',  'Thomas Carpenter').
      property('from',    'REDAAPReview').
      property('subject', 'Please Review').
      property('html',     body).
      send();

  }).then(() => {
    response.success('review sent successfully!');
  }).catch(error => {
    response.error(error);
  }); 
});





// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'send' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%

// send: 
//        receives client and survey data as well as a signature capture
//        it saves all the data then sends out and email with an attached pdf
//        to the client and pushes into crm
Parse.Cloud.define('send', (request, response) => {
  const {params, user} = request;
  const {client, options, pricing, survey} = params.data;
  // setup email generator instance
  const mailer = new Mailer(private.username, private.pw);
  // pdfFile is saved to Parse
  let orderNum;
  let pdfFile;
  let pdfUrl;
  let repData;

  // query the 'SalesOrder' class in order to fetch the newest sales order number
  const SalesOrder = Parse.Object.extend('SalesOrder');
  const orderQuery = new Parse.Query(SalesOrder);
  
  orderQuery.first({useMasterKey: true}).then(order => {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }

    orderNum = order.get('order');
    // increment the sales order number so it can be used for the next sale
    // reference the 'order' column in the SalesOrder class
    const orderObj = new SalesOrder();
    orderObj.id    = order.id;
    orderObj.increment('order');

    return orderObj.save(null, {useMasterKey: true});
  }).then(() => {
    // send all the data need to create a pdf to the redaappdf.js module
    const pdfData     = {user, pricing, survey, client, orderNum};
    const base64      = redaapPDF.makePDF(pdfData);
    // dynamically name the file based on company name
    const pdfFileName = client.companyName.
                          replace(/\s+|\/+|\"+|\-+|\(+|\)+/g, '').
                          trim().
                          toLowerCase() +
                          '.pdf';

    pdfFile = new Parse.File(pdfFileName, {base64});
    //start async with the promise returned by Parse file save method
    return pdfFile.save();
  }).then(res => {
    // unique link to the saved pdf for email body
    pdfUrl = res._url;
    // get a pointer to the user's company so later he/she may search saved surveys 
    // from other reps in that company as well
    // user.moreData is a pointer to the 'Trusted' Class row that contains the 
    // rep's company name
    const RepData      = Parse.Object.extend('Trusted');
    const repDataQuery = new Parse.Query(RepData);
    // user.moreData === Trusted.objectId
    return repDataQuery.get(user.get('moreData'), {useMasterKey: true});
  }).then(moreData => {
    // get companyName and phone number
    repData = moreData;

    const saveParams = {
      className: 'SentQuotes',
      client,
      orderNum,
      pdfFile,
      pricing,
      repData,
      survey,
      user
    };

    return utils.saveSurveyData(saveParams);
  }).then(() => {
    // rendered in email body
    const repName  = user.get('first') + ' ' + user.get('last');
    const repPhone = repData.get('phone');
    const repEmail = user.get('username');
    // email body
    let emailHtml = `<div>${client.clientName},</div> 
                     <div style="margin: 16px 0px 0px 0px;">Click the link below to view the proposal.</div>
                     <div style="margin: 32px 0px;">
                       <a href="${pdfUrl}">Proposal PDF</a>
                     </div>
                     <div>To learn more about REDAAP click <a href="https://www.teuservices.com/REDAAP">here.</a></div>`;
    // creat a link for each document to be added to the email html body                    
    const makeLink = (fileName, label) => {
      const html = `<div style="margin: 32px 0px;"> 
                      <a href="https://www.redaap.com/docs/${fileName}.pdf">${label}</a>
                    </div>`; 
      return html;                  
    }; 
    // options === {brochure: bool, credit: bool, contract: bool, capture: dataURL}
    // if (options.brochure) {
    //   const brochureHtml = makeLink('brochure', 'Brochure');
    //   emailHtml += brochureHtml;
    // }  
    if (options.credit) {
      const creditHtml = makeLink('creditapp', 'Credit Application');
      emailHtml += creditHtml;
    }
    // if (options.contract) {
    //   const contractHtml = makeLink('contract', 'Contract');
    //   emailHtml += contractHtml;
    // }  

    // added to end of email body
    const footer = `<div style="margin: 32px 0px;">
                      <div>${repName}</div>
                      <div>TEU Services, Inc.</div>
                      <div>${repPhone}</div>
                      <div>${repEmail}</div>
                    </div>`;

    const body = emailHtml + footer;

    // create and send the email                             
    return mailer.
      mail().
      property('to',       client.email).
      property('toName',   client.clientName).
      property('cc',       repEmail).
//      property('bcc', 'thomas@redaap.com').
      property('from',    'REDAAP').
      property('subject', 'REDAAP lighting proposal').
      property('html',     body).
      send();

  }).then(() => {
    response.success('email sent to client successfully!');
  }).catch(error => {
    response.error(error);
  }); 
});




// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'pricing' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%

//!!!!!!!!!!!!!!!!!!!!!!!!! WARNING !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// pricing func is brittle because Solutions class 'name' and 'existingFixture' cols are 
// hard coded into front-end so the app can do surveys offline then request finance
// data when user is back in service
// any changes to these two strings need to be matched in front-end


// pricing:
//          crunch the numbers for all term length options (ie. 12, 36, 60 months for REDAAP
//          or 0 for cash price) and fixtures from the survey in progress will need to fetch 
//          up to date pricing info from Solution class for each fixture in the survey 
//          (unit cost, parts cost, install, and shipping) then find the total and calc a 
//          grand total based on data from the Finance class such as (product margin, 
//          install margin, product commission, install commission, finance rate, maintenance, 
//          tax, and months in the term)
Parse.Cloud.define('pricing', (request, response) => {
  const {params, user} = request;
  const uSA            = params.data;
  let matches;
  // area === {name, fixtures}
  // fixture === {name, label, quantity, replacements, notes, elevation, animate, icon, openQty}
  // replacement === {color, count, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
  // tally === {tally0, tally1, tally2, tally3}
  // the query results may have more than one match for each fixture replacement
  // so create a list of existing fixtures with their replacements to extract 
  // from the results collection
  const {areasToMatch, fixtureNames, replacementNames} = pricingJs.contained(uSA);

  // make the initial query to the 'Solution' table in order to fetch pricing
  const Solution         = Parse.Object.extend('Solution');
  const replacementQuery = new Parse.Query(Solution);
  replacementQuery.containedIn('name', replacementNames);
  replacementQuery.containedIn('existingFixture', fixtureNames);
  // start promises
  replacementQuery.find({useMasterKey: true}).then(results => {
    // terminate the promise if there is no signed in user
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // results may contain more than one match for each query so find the 
    // first matching result based on the extisting
    // fixture string found in both ie. '2x4 troffer' and '4ft strip kit'
    // and the replacement name string ie. 'LED Par20 7w Lamp'
    matches = pricingJs.matches(results, areasToMatch);
    // get financial data specific to the length of each program term option
    const Finance      = Parse.Object.extend('Finance');
    const financeQuery = new Parse.Query(Finance);

    return financeQuery.find({useMasterKey: true});
  }).then(finances => {
    // map over all four finance options ie. term === 12, 36, 60 months or 0 for cash price
    const pricing = finances.map(finance => {
      // reference the attributes obj
      const fin  = finance.attributes;
      const term = fin.term;      
      // return a collection of pricing to the app
      const collection = matches.map((match, index) => {
        // match === {area, count, inputFixture, inputReplacement, result}
        const {hardCostEach, installSub} = pricingJs.getCostAndInstall(fin, match);
        const productSubEach   = pricingJs.subtotal(hardCostEach, fin.productMargin, fin.productCommission);
        // multiply by the number of fixutres counted in the survey
        const productOnlyTotal = pricingJs.round(productSubEach * match.count);
        const productOnlyTax   = pricingJs.cost(productOnlyTotal, fin.tax);
        const tot              = pricingJs.round((productSubEach + installSub) * match.count);
        const maintenance      = pricingJs.cost(tot, fin.maintenance);
        const tax              = pricingJs.cost(tot, fin.tax);

        const loanParams = {
          fin,
          installSub,
          maintenance,
          productOnlyTax,
          productOnlyTotal,
          tax,
          term,
          tot
        };

        const {installSubEach, loan, monthlyPayment, total} = pricingJs.loanForTerm(loanParams);

        return {
          area:             match.area,
          inputFixture:     match.inputFixture,
          fixture:          match.result.existingFixture,
          inputReplacement: match.inputReplacement,
          replacement:      match.result.name,
          count:            match.count,
          custom:           match.custom,
          customProduct:    match.customProduct,
          customInstall:    match.customInstall,
          hardCostEach,
          productSubEach,
          installSubEach,
          productOnlyTotal,
          productOnlyTax,
          total,
          maintenance,
          tax,
          loan,
          monthlyPayment
        };
      });

      const pricingObj = collection.reduce((prev, curr) => {
        prev.grandMonthly  = pricingJs.round(prev.grandMonthly += curr.monthlyPayment);
        prev.grandTax      = pricingJs.round(prev.grandTax += curr.tax);
        prev.totalQuantity += curr.count;

        return prev;
      }, {grandMonthly: 0, grandTax: 0, totalQuantity: 0});

      const surveyPricing = {
        collection,
        grandMonthly:  pricingObj.grandMonthly.toFixed(), // not showing cents
        grandTax:      (pricingObj.grandTax / (term > 0 ? term : 1)).toFixed(2),
        term,
        totalQuantity: pricingObj.totalQuantity
      };

      return surveyPricing;
    });

    response.success(pricing);
  }).catch(error => {
    response.error(error);
  }); 
});





// %%%%%%%%%%%%%%%%%%%%%%%%% 'photos' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%%

// photos:
//        labeled photos for machine learning algorithm training
//        each image is saved by the front-end fileUpload() function inside woker.js
//        because cloud code will not accept much raw data as a payload
//        The workaround solutions requires the images to be uploaded/saved to Parse by
//        using the js api to save each Parse.File then this cloud func to associate the
//        files to a Parse.Object
Parse.Cloud.define('photos', (request, response) => {
  const {params, user} = request;
  const {uploaded}     = params;
  // associate photos to their own Parse.Object along with the order number pointer
  const Photos = Parse.Object.extend('MLphotos');
  const saves  = [];
  // store unique fixture names so duplicates can be saved to their own row
  const names  = {};
  let columns  = [];
  // creates a new row in the 'MLphotos' class so any duplicate photos
  // will have their own rows since only one file can be associated
  // per column
  const saveRow = cols => {
    // create new row
    const photos = new Photos();
    // set cols
    cols.forEach(column => {
      // column names strings cannot start with a number ie. 2ftt8t12
      const colName = `ml${column.columnName}`;
      photos.set(colName, column.imageFile);
    });
    // for Parse.Promise.when
    saves.push(photos.save());
  };  
  // sift through uploaded photos and create a new row anytime 
  // multiple photos of the same fixture are found
  uploaded.forEach(upload => {
    // ie. tfssba9baa8c2eaa4bcca7d7a11a1c3f7e98_468can.png --> 468can
    const columnName = upload._name.split('_').pop().split('.').shift();
    // the Parse.File association
    const imageFile  = {__type: "File", name: upload._name, url: upload._url};
    // passed into saveRow
    const column     = {columnName, imageFile};
    // check if the current fixture type already has a photo saved to it
    // if so, make a new row
    if (names[columnName]) {
      saveRow(columns);
      // reset columns and start with the column duplicate
      names[columnName] = false;
      columns           = [column];
    } else {
      // new and unique fixture type
      names[columnName] = true;
      columns.push(column);
    }
  });
  // run saveRow for last row
  saveRow(columns);
  // save in parallel
  Parse.Promise.when(saves).then(() => {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    response.success('photos saved');
  }).catch(error => {
    response.error(error);
  }); 
});






// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'search' is current for v0.4.6 %%%%%%%%%%%%%%%%%%%%%%%%%%

// search:
//        search the db for previously saved surveys for editing inside the app
Parse.Cloud.define('search', (request, response) => {
  // only allow users from the same company to search for and edit each others surveys
  const {params, user}          = request;
  const {userSurveys, col, str} = params;
  // the trusted class is used to sign up new users and also contains sensitive info about
  // each user including the company they work for
  // use the company data in order to restrict any query to only those that belong to the
  // same company as the user who is requesting the data
  const Trusted      = Parse.Object.extend('Trusted');
  const trustedQuery = new Parse.Query(Trusted);
  // user.moreData contains the objectId of the Trusted Class object that is tied to user
  // it has the rep's company name which is used to restrict the search to surveys
  // that belong to that company only
  let moreData;
  const results = {};

  const runBothQueries = (lowerCaseQuery, capitalizedQuery) => {
    // restrict to only same company data
    lowerCaseQuery.equalTo('repCompanyName', moreData.get('repCompanyName'));
    if (userSurveys) {
      lowerCaseQuery.equalTo('repFirstName', user.get('first'));
      lowerCaseQuery.equalTo('repLastName', user.get('last'));
    }
    // optional filtering of survey query by user
    // they can provide an extra column to search and string to match
    // search for both the all lower cased string as well as the same string
    // with the first letter capitalized
    if (col && str) {
      if (col === 'orderNum') {
        lowerCaseQuery.equalTo('orderNum', Number(str));
      } else {
        // normalize user input string for search
        const lowerCaseString = str.toLowerCase();
        // make a capitalized version of the str
        const capQueryString = utils.capFirst(str);
        // make a second query for the case where the user wants to filter the 
        // results by SurveyData Class column
        // in this case, search for the results filtered by an all lowercase string
        // as well as the same string with its first letter capitalized to make 
        // the search more case insensitive
        capitalizedQuery.equalTo('repCompanyName', moreData.get('repCompanyName'));

        if (userSurveys) {
          capitalizedQuery.equalTo('repFirstName', user.get('first'));
          capitalizedQuery.equalTo('repLastName', user.get('last'));
        }
        // add constraints to both queries
        lowerCaseQuery.startsWith(col, lowerCaseString);
        capitalizedQuery.startsWith(col, capQueryString);
        // Parse allows the union of two seperate queries with the Parse.Query.or method
        const bothQueries = Parse.Query.or(lowerCaseQuery, capitalizedQuery);
        // pass data back in chronological order of newest first
        bothQueries.descending('createdAt');
        bothQueries.limit(10);

        return bothQueries.find();
      }
    }
    // pass data back in chronological order of newest first
    lowerCaseQuery.descending('createdAt');
    lowerCaseQuery.limit(10);

    return lowerCaseQuery.find();
  };


  const upperAndLowerCaseQueries = classStr => {
    const classObj   = Parse.Object.extend(classStr);
    const lowerQuery = new Parse.Query(classObj);
    const upperQuery = new Parse.Query(classObj);

    return runBothQueries(lowerQuery, upperQuery); 
  };


  trustedQuery.get(user.get('moreData'), {useMasterKey: true}).then(moredata => {
    moreData = moredata;
    // terminate the promise if there is no signed in user
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // cannot promise.all or promise.when with Parse.Query.or
    return upperAndLowerCaseQueries('SavedForLater');
  }).then(saved => {
    results.saved = saved;
    return upperAndLowerCaseQueries('QuotesToReview');
  }).then(review => {
    results.review = review;
    return upperAndLowerCaseQueries('SentQuotes');
  }).then(sent => {
    results.sent = sent;
    // check if no results were found and if email and password strings exist
    if (!results.saved.length && !results.review.length && !results.sent.length) {
      return Parse.Promise.error('{"message": "we could not find the surveys you searched for"}');
    }

    response.success(results);
  }).catch(error => {
    response.error(error);
  }); 
});





// %%%%%%%%%%%%%%%%%%%%%%%%%% 'signup' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
// signup:
//        create a new user based off a list of trusted individuals from the rep class
Parse.Cloud.define('signup', (request, response) => {
  const {email, password} = request.params;
  // setup a query against the trusted class
  const Trusted      = Parse.Object.extend('Trusted');
  const trustedQuery = new Parse.Query(Trusted);
  trustedQuery.equalTo('email', email);
  // start promises with Parse.Query
  trustedQuery.first({useMasterKey: true}).then(result => {
    // check if no results were found and if email and password strings exist
    if (!result || !email || !password) {
      return Parse.Promise.error('{"message": "we could not sign you up"}');
    }
    // test given password against DB
    if (result.get('password') !== password) { 
      return Parse.Promise.error('{"message": "incorrect password"}'); 
    }

    const user = new Parse.User();
    // make user info not public read or write-able

    // TODO:
    //      const userACL = new Parse.ACL(user.id);
    //      userACL.setReadAccess(user, true);
    //      userACL.setWriteAccess(user, false);
    //      user.setACL(surveyACL);
    user.setACL(new Parse.ACL(user.id));
    user.set('username', email);
    user.set('password', password);
    user.set('first',    result.get('first'));
    user.set('last',     result.get('last'));

    // TODO:
    //      Set moreData to a pointer or relation
    user.set('moreData', result.id);

    return user.signUp(null, {useMasterKey: true});
  }).then(user => {
    response.success(user);
  }).catch(error => {
    response.error(error);
  }); 
});











// %%%%%%%%%%%%%%%%%%%%%%%%%%%% 'invite' is current for v0.3.3 %%%%%%%%%%%%%%%%%%%%%%%%%%

// invite: 
//        sends an email to another surveyor containing a url link to the client app
//        channel page that has the channel's key in the url parameter
//        the key is injected into the app which then connects the invited user to 
//        the same firebase realtime database channel as the user who sent the invitation 
Parse.Cloud.define('invite', (request, response) => {
  const {params, user}   = request;
  const {channel, email} = params;
  // setup email generator instance
  const mailer = new Mailer(private.username, private.pw);
  // rendered in email body
  const repName  = `${user.get('first')} ${user.get('last')}`;
  const repEmail = user.get('username');
  // user.moreData is a pointer to the 'Trusted' Class row that contains the 
  // rep's company name
  const RepData      = Parse.Object.extend('Trusted');
  const repDataQuery = new Parse.Query(RepData);
  // user.moreData === Trusted.objectId
  repDataQuery.get(user.get('moreData'), {useMasterKey: true}).then(repData => {

    const repPhone = repData.get('phone');


    // production client
    
    // const body = `<p>${repName} would like to collaborate with you using the REDAAP web app.</p> 
    //               <p>Click the link below in order to connect REDAAP in realtime.</p>
    //               <div style="margin: 32px 0px;">
    //                 <a href="https://www.redaap.com/#!/channel/?${channel}">Link Apps</a>
    //               </div>
    //               <div style="margin: 32px 0px;">
    //                 <div>${repName}</div>
    //                 <div>TEU Services, Inc.</div>
    //                 <div>${repPhone}</div>
    //                 <div>${repEmail}</div>
    //               </div>`;


    // test client

    const body = `<p>${repName} would like to collaborate with you using the REDAAP web app.</p> 
                  <p>Click the link below in order to connect REDAAP in realtime.</p>
                  <div style="margin: 32px 0px;">
                    <a href="https://www.redaap.teuservices.com/#!/channel/?${channel}">Link Apps</a>
                  </div>
                  <div style="margin: 32px 0px;">
                    <div>${repName}</div>
                    <div>TEU Services, Inc.</div>
                    <div>${repPhone}</div>
                    <div>${repEmail}</div>
                  </div>`;

    // create and send the email                             
    return mailer.
      mail().
      property('to',       email).
      property('from',    'REDAAP').
      property('subject', 'REDAAP collaboration invitation').
      property('html',     body).
      send();

  }).then(() => {
    response.success('invite email sent!');
  }).catch(error => {
    response.error(error);
  }); 
});








// ??????????????? change httpRequest url from https://test.redaap.net... ??????????
// ??????????????? to https://redaap.net... for production                ??????????


// Gridstore file adapter delete files one at a time when obj is deleted from dashboard
Parse.Cloud.beforeDelete('MLphotos', (request, response) => {
  const allColKeys = Object.keys(request.object.attributes);

  const lightKeys = allColKeys.filter(key => key !== 'createdAt' && key !== 'updatedAt');

  const promises = lightKeys.map(light => {
    const fileName = request.object.get(light).name();

    return Parse.Cloud.httpRequest({
      method: 'DELETE',
      url:    'https://test.redaap.net/parse/files/' + fileName,
      headers: {
        'X-Parse-Application-Id': private.appID,
        'X-Parse-Master-Key':     private.masterKey
      }


      // test this with no call to response.success first
      // headers: {
      //   'X-Parse-Application-Id': process.env.APP_ID,
      //   'X-Parse-Master-Key':     process.env.MASTER_KEY
      // }


      
    });
  });

  Parse.Promise.when(promises).
    then(responses => {
      request.log.info(responses.length + ' file(s) deleted from MLphotos');
      response.success();
    }).
    catch(error => {
      request.log.error('Delete failed with response code ' + error.data.code);
      response.error(error);
    });
});




// delete files from AWS S3 storage bucket when obj is deleted from table

// // I have a class called "classContainingFileAttr" which contains a column "pfFilecolumn" that's of PFFile type. When I delete that class object on Parse server, the file still exists in S3, so I would like to delete that orphaned file in order to save space.

// // in packages.json, add the following:
// // "aws-sdk": "latest"

// // in main.js, add the following:
// var AWS = require('aws-sdk');

// AWS.config.update({
// accessKeyId : 'xxxxx',
// secretAccessKey : 'xxxxx'
// });
// AWS.config.region = 'xxxxxx';

// function deleteS3File( fn ) {
// var bucketInstance = new AWS.S3();
// var params = {
// Bucket: 'elasticbeanstalk-xxxxxxxx',
// Key: 'images/' + fn // my image files are under /images folder
// };
// bucketInstance.deleteObject(params, function (err, data) {
// if (err) {
// console.log("deleteS3File - Check if you have sufficient permissions : "+err);
// }
// // else {
// // console.log("deleteS3File - File deleted successfully = images/" + fn + ", with error: " + err);
// // }
// });
// }

// // clean up orphaned file on S3
// Parse.Cloud.beforeDelete('MLphotos', (request, response) => {
// deleteS3File( request.object.get("pfFilecolumn").name() );
// });








/////////// end ////////////////////////////////