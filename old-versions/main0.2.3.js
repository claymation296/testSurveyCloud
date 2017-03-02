//###################### app version 0.2.4 and not used in 0.3.3 ######################################
var private = require('../private-credentials/private.js');

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
Parse.Cloud.define('testFinance', function(request, response) {
  Parse.Cloud.useMasterKey(); 
  // area === {name, fixtures}
  // fixture === {name, label, quantity, replacements, notes, elevation, animate, icon, openQty}
  // replacement === {color, count, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
  // tally === {tally0, tally1, tally2, tally3}
   
  var uSA = request.params.data;
  var user = request.user;
  var matches;
  // the query results may have more than one match for each fixture replacement
  // so create a list of existing fixtures with their replacements to extract 
  // from the results collection
  var fixturesToMatch = [];
  // create an array of fixtures to used in the 'containedIn' query constraint
  var fixtureNamesToQuery = [];
  // return an array of replacements to used in the 'containedIn' query constraint
  var replacementNamesToQuery = uSA.reduce(function(prev, curr) {
    var replacements = curr.fixtures.reduce(function(previous, current) {
      // split and trim are used to isolate the first option in the fixutre string
      // because the first and third fixture list strings contain multiple choices 
      // that all have the same solution ie. '2x4 Troffer / 4ft Strip Fixture / 4ft F Bay'
      var fixtureName = current.name.split(' /')[0].trim();
      // get just the replacement names
      var names = current.replacements.map(function(replacement) {
        // create an array of fixture names with their corresponding replacement
        // names so the Parse.query results can be matched exactly with the inputs
        var fixtureObj = {
          area: curr.name,
          fixture: fixtureName,
          replacement: replacement.name,
          count: replacement.count
        };
        fixturesToMatch.push(fixtureObj);

        return replacement.name;
      });
      fixtureNamesToQuery.push(fixtureName);
      previous = previous.concat(names);
      return previous;
    }, []);
    prev = prev.concat(replacements);
    return prev;
  }, []);

  // make the initial query to the 'Solution' table in order to fetch pricing
  var Solution = Parse.Object.extend('Solution');
  var replacementQuery = new Parse.Query(Solution);
  replacementQuery.containedIn('name', replacementNamesToQuery);
  replacementQuery.containedIn('existingFixture', fixtureNamesToQuery);
  // start promises
  replacementQuery.find().then(function(results) {
    // terminate the promise if there is no signed in user
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // pull out the attributes obj from each result 
    // which contains the neccessary data from the 'Solution' table
    var resultsCollection = results.map(function(element) {
      return element.attributes;
    });
    // results may contain more than one match for each query so find the 
    // first matching result based on the extisting
    // fixture string found in both ie. '2x4 troffer' and '4ft strip kit'
    // and the replacement name string ie. 'LED Par20 7w Lamp'
    matches = fixturesToMatch.map(function(obj) {
      // using a for loop instead of .filter in order to break out early
      // on first match
      var length = resultsCollection.length;
      var match, result;
      for (var i = 0; i < length; i += 1) {
        result = resultsCollection[i];
        if (result.name === obj.replacement && result.existingFixture === obj.fixture) {
          match = {
            area: obj.area,
            count: obj.count,
            inputFixture: obj.fixture,
            inputReplacement: obj.replacement,
            result: result
          };
          break;
        }
      }
      return match;
    });

    // get financial data specific to the length of each program term option
    var Finance = Parse.Object.extend('Finance');
    var financeQuery = new Parse.Query(Finance);

    return financeQuery.find();
  }).then(function(finances) {

    // keep cents accurate by avoiding decimal math
    var roundNum = function(num) {
      return Math.round(num * 100) / 100;
    };
    // this equation comes from Kenneth's xcel formulas
    var subtotal = function(price, margin, commission) {
      return roundNum((((price * 100) / (100 - margin)) * 100) / (100 - commission));
    };
    // this equation comes from Kenneth's xcel formulas
    var cost = function(tot, percent) {
      return roundNum(((tot * 100) / (100 - percent)) - tot);
    };
    // this function contains the same mathmatical formula as the native 
    // xcel PMT function
    var pmt = function(rate, numOfPayments, tot) {
      var monthly = (rate / 100) / 12;
      var pvif = Math.pow(1 + monthly, numOfPayments);
      return monthly * tot * (pvif / (pvif - 1));
    };

    // map over all four finance options ie. term === 12, 36, 60 months or 0 for cash price
    var pricing = finances.map(function(finance) {
      // reference the attributes obj
      var fin = finance.attributes;
      var term = fin.term;
      
      // return an obj with a pricing collection, grand monthly payment,
      // and total fixutres to the app
      var surveyPricing = {};
      // return a collection of pricing to the app
      surveyPricing.collection = matches.map(function(match, index) {
        // match === {count, inputFixture, inputReplacement, result}
        // result is the Solutions Class object returned from the replacementQuery
        var result = match.result;

        var hardCostEach = result.unitCost + result.partsCost + result.shipping;
        var productSubEach = subtotal(hardCostEach, fin.productMargin, fin.productCommission);
        var installSubEach = subtotal(result.install, fin.installMargin, fin.installCommission);
        // multiply by the number of fixutres counted in the survey
        var productOnlyTotal = roundNum(productSubEach * match.count);
        var productOnlyTax = cost(productOnlyTotal, fin.tax);
        var total = roundNum((productSubEach + installSubEach) * match.count);
        var maintenance = cost(total, fin.maintenance);
        var tax = cost(total, fin.tax);

        var loan;
        var monthlyPayment;
        // term === 0 for cash price and -1 for cash w/o install
        if (term > 0) {
          loan = roundNum(pmt(fin.rate, term, total) * term);
          monthlyPayment = roundNum((loan + maintenance + tax) / term);
        } else if (term === 0) {
          // cash price does not include term or loan calcs
          loan = 0;
          monthlyPayment = roundNum(total + maintenance + tax);
        } else if (term === -1) {
          total = 0;
          loan = 0;
          monthlyPayment = roundNum(productOnlyTotal + productOnlyTax);
          installSubEach = 0;
        }

        // total monthlyPayments together while mapping
        surveyPricing.grandMonthly = surveyPricing.grandMonthly || 0;
        // use toFixed to pad cents with zeros if need be
        surveyPricing.grandMonthly = roundNum(surveyPricing.grandMonthly += monthlyPayment); 
        // total taxes together while mapping
        surveyPricing.grandTax = surveyPricing.grandTax || 0;
        surveyPricing.grandTax = roundNum(surveyPricing.grandTax += tax);
        // total counts together while mapping
        surveyPricing.totalQuantity = surveyPricing.totalQuantity || 0;
        surveyPricing.totalQuantity = surveyPricing.totalQuantity += match.count;

        return {
          area: match.area,
          inputFixture: match.inputFixture,
          fixture: result.existingFixture,
          inputReplacement: match.inputReplacement,
          replacement: result.name,
          count: match.count,
          hardCostEach: hardCostEach,
          productSubEach: productSubEach,
          installSubEach: installSubEach,
          productOnlyTotal: productOnlyTotal,
          productOnlyTax: productOnlyTax,
          total: total,
          maintenance: maintenance,
          tax: tax,
          loan: loan,
          monthlyPayment: monthlyPayment
        };
      });
      // not showing cents
      surveyPricing.grandMonthly = (surveyPricing.grandMonthly).toFixed();
      surveyPricing.grandTax = (surveyPricing.grandTax / (term > 0 ? term : 1)).toFixed(2);
      // send back the term used in calculations
      surveyPricing.term = term;

      return surveyPricing;
    });

    response.success(pricing);

  }, function(error) {
    response.error(error);
  }); 
});










// email: 
//        receives client and survey data as well as a signature capture
//        it saves all the data then sends out and email with an attached pdf
//        to the client along with a bcc to TEU
Parse.Cloud.define('testEmail', function(request, response) {
  Parse.Cloud.useMasterKey(); 
  // setup email generator instance
  var mailer = new Mailer(private.userName, private.pw);
  // pdfFile is saved to Parse
  var pdfFile;
  // mailer requires attachments to be a buffer
  var pdfBuffer;
  // grab params from request
  var data = request.params.data;
  // pricing === {grandMonthly, term, totalQuantity, 
  //   collection: [{
  //     inputFixture: dataArray[index].fixture,
  //     fixture: el.existingFixture,
  //     inputDescription: dataArray[index].description,
  //     description: el.name,
  //     count: dataArray[index].count,
  //     hardCostEach: hardCostEach,
  //     productSubEach: productSubEach,
  //     installSubEach: installSubEach,
  //     total: total,
  //     maintenance: maintenance,
  //     tax: tax,
  //     loan: loan,
  //     monthlyPayment: monthlyPayment
  //   }]}
  var pricing = data.pricing;
  // survey === [
  //   area === {name, fixtures}
  //   fixture === {name, label, quantity, replacements, notes, elevation, animate, icon, openQty}
  //   replacement === {color, count, domIf, elevation, icon, label, name, openQty, showButtons, tallies}
  //   tally === {tally0, tally1, tally2, tally3}
  // ]
  var survey = data.survey;
  // saved image Parse.Files name and url used to associate the files to Parse.Objects
  var pictureAssociationObjs = data.pictureAssociationObjs;
  // data.form === {client, capture}
  // client === {clientName, phone, email, companyName, address, city, state, zip, 
  //             projectName, projectAddress, projectContact, projectDescription}
  var client = data.form.client;
  var user = request.user;
  // // signature capture .jpg dataurl
  var capture = data.form.capture;
  // orderNum is saved to Parse 'Photos' and 'SurveyData' classes
  var orderNum;


  // query the 'SalesOrder' class in order to fetch the newest sales order number
  var SalesOrder = Parse.Object.extend('SalesOrder');
  var orderQuery = new Parse.Query(SalesOrder);
  // start promise chain
  orderQuery.first().then(function(order) {
    // make sure there was an authenticated user making the request
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // reference the 'order' column in the SalesOrder class
    orderNum = order.get('order');
    // increment the sales order number so it can be used for the next sale
    var orderObj = new SalesOrder();
    orderObj.id = order.id;
    orderObj.increment('order');

    return orderObj.save();
  }).then(function() {
    // send all the data need to create a pdf to the redaappdf.js module
    var pdfData = {
      user: user,
      pricing: pricing,
      survey: survey,
      client: client,
      user: user,
      capture: capture,
      orderNum: orderNum
    };
    // redaappdf.js module
    var base64 = redaapPDF.makePDF(pdfData);
    // sendgrid requires a buffer
    pdfBuffer = new Buffer(base64, 'base64');
    pdfFile = new Parse.File('quote.pdf', {base64: base64});
    //start async with the promise returned by Parse file save method
    return pdfFile.save();
  }).then(function() {
    // each image is saved by the front-end _saveDataAndSendEmail() function
    // because cloud code will no accept much raw data as a payload
    // The workaround solutions requires the images to be uploaded/saved to Parse by
    // using the js api to save each Parse.File then this cloud func to associate the
    // files to a Parse.Object
    if (pictureAssociationObjs && pictureAssociationObjs.length) {
      // associate photos to their own Parse.Object along with the order number pointer
      var Photos = Parse.Object.extend('Photos');
      var photos = new Photos();
      // order number is a pointer to the surveyData object 'orderNum' column
      photos.set('orderNum', orderNum);
      // must associate the saved Parse.Files to the 'photo' class object
      pictureAssociationObjs.forEach(function(obj, index) {
        var columnName = 'photo' + index.toString();
        // need __type, name, url to make Parse associate the image with the object
        // (unique file name and url passed back to parseFile.save() response)
        var imageFile = {
          __type: "File",
          name: obj.name,
          url: obj.url
        };
        photos.set(columnName, imageFile);
      });

      return photos.save();
    }
    return;

  }).then(function() {
    // get a pointer to the user's company so later he/she may search saved surveys 
    // from other reps in that company as well
    // user.moreData is a pointer to the 'Trusted' Class row that contains the 
    // rep's company name
    var RepData = Parse.Object.extend('Trusted');
    var repDataQuery = new Parse.Query(RepData);
    // user.moreData === Trusted.objectId
    return repDataQuery.get(user.get('moreData'));
  }).then(function(moreData) {
    // access the Parse SurveyData class
    var SurveyData = Parse.Object.extend('SurveyData');
    var surveyData = new SurveyData();


    // TODO: 
    //      make proper acl's so any rep who belongs to a particular company may edit
    //      any survey from other reps in that company for validation or follow-up purposes

    // // lock surveyData down so only the rep who created it may read from it in the future
    // var surveyACL = new Parse.ACL();
    // surveyACL.setReadAccess(user, true);
    // surveyACL.setWriteAccess(user, false);
    // surveyData.setACL(surveyACL);


    // setup then save to the surveyData class
    // client === {clientName, phone, email, companyName, address, city, state, zip}
    // survey === [{fixture, replacement, count, tallyArray: [{name, tally0, tally1, tally2, tally3}]}]
    // cycle over the client object and set a data column for each key
    var clientKeys = Object.keys(client);
    clientKeys.forEach(function(key) {
      surveyData.set(key, client[key]);
    });
    // add the data collected durning the survey along with the pdf
    surveyData.set('pricing', pricing);
    surveyData.set('monthly', Number(pricing.grandMonthly));
    surveyData.set('quantity', pricing.totalQuantity);
    surveyData.set('term', Number(pricing.term));
    surveyData.set('orderNum', orderNum);
    surveyData.set('repCompanyName', moreData.get('repCompanyName'));
    surveyData.set('rep', user);
    surveyData.set('repFirstName', user.get('first'));
    surveyData.set('repLastName', user.get('last'));
    surveyData.set('data', survey);   
    surveyData.set('pdf', pdfFile);

    return surveyData.save();
  }).then(function() {
    // rendered in email body as plain text
    var emailText = 'Please review the attached PDF document and save it for your records.\n' +
      'Contact us if you did not receive or cannot view the attached PDF file.';
    var repEmail = user.get('username');

    return mailer.
      mail().
      property('to', client.email).
      property('toName', client.clientName).
// replace cc with crm integration
      property('cc', repEmail).
// replace bcc with teuredaap@gmail.com
      property('bcc', 'thomascarpenter@teulights.com').
      property('from', 'REDAAP').
      property('subject', 'Your recent lighting proposal').
      property('text', emailText).
      attach('quote.pdf', 'application/pdf', pdfBuffer).
      send();


  }).then(function() {
    response.success('data saved and email sent successfully!');
  }, function(error) {
    response.error(error);
  }); 
});









// search:
//        search the db for previously saved surveys for editing inside the app
Parse.Cloud.define('testSearch', function(request, response) {
  Parse.Cloud.useMasterKey(); 
  // only allow users from the same company to search for and edit each others surveys
  var user = request.user;
  var userSurveys = request.params.userSurveys
  var queryColumn = request.params.col;
  var queryString = request.params.str;
  // the trusted class is used to sign up new users and also contains sesitive info about
  // each user including the company they work for
  // use the company data in order to restrict any query to only those that belong to the
  // same company as the user who is requesting the data
  var Trusted = Parse.Object.extend('Trusted');
  var trustedQuery = new Parse.Query(Trusted);
  // user.moreData contains the objectId of the Trusted Class object that is tied to user
  // it has the rep's company name which is used to restrict the search to surveys
  // that belong to that company only
  trustedQuery.get(user.get('moreData')).then(function(moreData) {
    // terminate the promise if there is no signed in user
    if (!user) {
      return Parse.Promise.error('{"message": "you must sign up or log in ' + 
        'before you can use this feature"}');
    }
    // setup a query against the SurveyData class that stores all surveys
    var Surveys = Parse.Object.extend('SurveyData');
    var surveyQuery = new Parse.Query(Surveys);
    // restrict to only same company data
    surveyQuery.equalTo('repCompanyName', moreData.get('repCompanyName'));
    if (userSurveys) {
      surveyQuery.equalTo('repFirstName', user.get('first'));
      surveyQuery.equalTo('repLastName', user.get('last'));
    }
    // optional filtering of survey query by user
    // they can provide an extra column to search and string to match
    // search for both the all lower cased string as well as the same string
    // with the first letter capitalized
    if (queryColumn && queryString) {
      if (queryColumn === 'orderNum') {
        surveyQuery.equalTo('orderNum', Number(queryString));
      } else {
        // nomalize user input string for search
        var lowerCaseString = queryString.toLowerCase();
        // make a capitalized version of the queryString
        var stringArray = lowerCaseString.split('');
        var cap = stringArray[0].toUpperCase();
        stringArray[0] = cap;
        var capQueryString = stringArray.join('');
        // make a second query for the case where the user wants to filter the 
        // results by SurveyData Class column
        // in this case, search for the results filtered by an all lowercase string
        // as well as the same string with its first letter capitalized to make 
        // the search more case insensitive
        var CapitalizedSurveys = Parse.Object.extend('SurveyData');
        var capitalizedQuery = new Parse.Query(CapitalizedSurveys);
        capitalizedQuery.equalTo('repCompanyName', moreData.get('repCompanyName'));
        if (userSurveys) {
          capitalizedQuery.equalTo('repFirstName', user.get('first'));
          capitalizedQuery.equalTo('repLastName', user.get('last'));
        }
        // add constraints to both queries
        surveyQuery.startsWith(queryColumn, lowerCaseString);
        capitalizedQuery.startsWith(queryColumn, capQueryString);
        // Parse allows the union of two seperate queries with the Parse.Query.or method
        var bothQueries = Parse.Query.or(surveyQuery, capitalizedQuery);
        // pass data back in chronological order of newest first
        bothQueries.descending('createdAt');
        bothQueries.limit(20);

        return bothQueries.find();
      }
    }
    // pass data back in chronological order of newest first
    surveyQuery.descending('createdAt');
    surveyQuery.limit(20);

    return surveyQuery.find();
  }).then(function(results) {
    // check if no results were found and if email and password strings exist
    if (!results) {
      return Parse.Promise.error('{"message": "we could not find the surveys you searched for"}');
    }

    response.success(results);

  }, function(error) {
    response.error(error);
  }); 
});
