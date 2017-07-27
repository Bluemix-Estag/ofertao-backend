var express = require('express'),
    http = require('http'),
    path = require('path'),
    fs = require('fs'),
    geolib = require('geolib');

var app = express();

var db;

var cloudant;

var dbCredentials = {
    dbName: 'my_sample_db'
};

var bodyParser = require('body-parser');
var methodOverride = require('method-override');

// all environments
app.set('port', process.env.PORT || 4000);
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());







function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else {
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);

    // Check Stores document.
    db.get('stores', {
        revs_info: true
    }, function (err, doc) {
        if (err) {
            console.log('Creating Stores document...');
            addStores();
        } else {
            console.log('Stores document already exists!');

        }
    })
}


initDBConnection();

function addStores() {

    var doc = require('./config/stores.json');

    console.log('Checking store promotions..');
    checkStoresPromotions(doc['data'], 0, function (data) {
        console.log('Stores promotions checked.');
        var stores = {};
        for (var store of data) {
            stores[store.id] = store;
            stores[store.id]['storeType'] = checkStoreType(store);
        }
        doc['stores'] = stores;
        delete doc['data'];
        db.insert(doc, 'stores', function (err, document) {
            if (err) {
                console.log('An error ocurred on creating Stores document.');
            } else {
                console.log('Stores document created successfully.');
            }

        });

    });
}

function checkStoreType(store){
    var name = store.name.toLowerCase();
    return (name.includes("posto"))?"Posto":(name.includes("express"))?"Express":(name.includes("drogaria"))?"Drogaria":(name.includes("bairro"))?"Bairro":"Hipermercado";
}


function checkStoresPromotions(stores, i, callback) {
    console.log(i + ' / ' + stores.length + ' Stores');
    if (i >= stores.length - 1) {
        callback(stores);
    } else {
        db.get('promotions_' + stores[i]['id'], (err, doc) => {
            if (err) {
                stores[i]['hasPromotions'] = false;
            } else {
                stores[i]['hasPromotions'] = true;
            }

            checkStoresPromotions(stores, i + 1, callback);
        })
    }
}


app.post('/getStoresWithOffer', (req, res) => {

    getNearStores(req, (nearByStores, location) => {
        getPromotionByOffer(nearByStores, 0, req.body.product_offer, [], (stores) => {
            res.status(200).json({
                error: false,
                location,
                stores
            });
        })
    });
});


app.post('/getOffersByCategory', (req, res) => {
    getNearStores(req, (nearByStores, location) => {
        getPromotionsByCategory(nearByStores, 0, req.body.category, [], (stores) => {
            res.status(200).json({
                error: false,
                location,
                stores
            });
        })
    })
})


function getPromotionByOffer(nearByStores, i, product_offer, storesWithOffer, callback) {
    if (i >= nearByStores.length - 1) {
        callback(storesWithOffer);
    } else {
        if (nearByStores[i]['hasPromotions'] == true) {
            db.get('promotions_' + nearByStores[i]['id'], (err, doc) => {
                if (err) {
                    nearByStores[i]['all_promotions'] = [];
                } else {
                    var offers = [];
                    var doc_offers = doc['data'];
                    for (var offer of doc_offers) {
                        if (product_offer['product'] != null && product_offer['brand'] != null && offer['name'].includes(product_offer['product']) && offer['name'].includes(product_offer['brand'])) {
                            offers.push(offer);
                        } else if ((product_offer['product'] != null && product_offer['brand'] == null) && (offer['name'].includes(product_offer['product']) && !offer['name'].includes(product_offer['brand']))) {
                            offers.push(offer);
                        } else if ((product_offer['product'] == null && product_offer['brand'] != null) && (!offer['name'].includes(product_offer['product']) && offer['name'].includes(product_offer['brand']))) {
                            offers.push(offer);
                        }
                    }

                    if (offers.length > 0) {
                        nearByStores[i]['promotions'] = offers;
                        storesWithOffer.push(nearByStores[i]);
                    }
                    nearByStores[i]['all_promotions'] = doc_offers;
                }
                getPromotionByOffer(nearByStores, i + 1, product_offer, storesWithOffer, callback);
            })
        } else {
            nearByStores[i]['all_promotions'] = [];
            getPromotionByOffer(nearByStores, i + 1, product_offer, storesWithOffer, callback);
        }
    }
}

function getPromotionsByCategory(nearByStores, i, category, storesWithOffer, callback) {
    if (i >= nearByStores.length - 1) {
        callback(storesWithOffer);
    } else {
        if (nearByStores[i]['hasPromotions'] == true) {

            db.get('promotions_' + nearByStores[i]['id'], (err, doc) => {
                if (err) {
                    nearByStores[i]['all_promotions'] = [];
                } else {
                    var offers = [];
                    var doc_offers = doc['data'];
                    for (var offer of doc_offers) {
                        if (offer['category'].toLowerCase().includes(category.toLowerCase())) {
                            offers.push(offer);
                        }
                    }
                    if (offers.length > 0) {
                        nearByStores[i]['promotions'] = offers;
                        storesWithOffer.push(nearByStores[i]);
                    }
                    nearByStores[i]['all_promotions'] = doc_offers;
                }

                getPromotionsByCategory(nearByStores, i + 1, category, storesWithOffer, callback);
            });

        } else {
            nearByStores[i]['all_promotions'] = [];
            getPromotionsByCategory(nearByStores, i + 1, category, storesWithOffer, callback);
        }
    }
}



function getNearStores(req, callback) {

    var data = req.body;
    var location = data.location;
    var radius = location.radius || null;



    db.get('stores', {
        revs_info: true
    }, (err, doc) => {
        if (err) {
            res.status(500).json({
                error: true,
                description: "Internal server error",
                statusCode: 500
            });
        } else {
            var stores = doc.stores;
            var spots = {};

            for (var store_id of Object.keys(stores)) {
                spots[store_id] = stores[store_id].location;

            }
            var nearByStores = geolib.orderByDistance({
                    latitude: location.latitude,
                    longitude: location.longitude
                },
                spots
            );

            nearByStores = nearByStores.filter(function (nearStore) {
                if (radius != null && nearStore.distance > radius) {
                    return false;
                } else {
                    return true;
                }
            })
            nearByStores = nearByStores.map(function (nearStore) {
                var store = stores[nearStore.key];
                store.distance = geolib.convertUnit('km', nearStore.distance);
                return store;
            })

            callback(nearByStores, location);
        }
    });
}


app.post('/getNearStores', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    getNearStores(req, (nearByStores, location) => {
        getPromotionByStoreId(nearByStores, 0, (stores) => {
            res.status(200).json({
                error: false,
                location,
                stores
            });

        });
    })
});


function getPromotionByStoreId(nearByStores, i, callback) {
    console.log('store length: ', nearByStores.length, ' i: ', i)
    if (i >= nearByStores.length - 1) {
        callback(nearByStores);
    } else {

        if (nearByStores[i]['hasPromotions'] == true) {
            db.get('promotions_' + nearByStores[i]['id'], (err, doc) => {
                if (err) {
                    nearByStores[i]['all_promotions'] = [];
                } else {
                    nearByStores[i]['all_promotions'] = doc['data'];
                }

                getPromotionByStoreId(nearByStores, i + 1, callback);

            })

        } else {
            nearByStores[i]['all_promotions'] = [];
            getPromotionByStoreId(nearByStores, i + 1, callback);
        }


    }

}



app.get('/getStoreById', (req, res) => {
    console.log('getStoreById method invoked.. ');
    var id = req.query.id;

    var jsonQuery = JSON.parse("{\"selector\":{\"stores\":{\"" + id + "\":{\"$exists\": true}}},\"fields\":[\"stores." + id + "\"]}");


    db.find(jsonQuery, function (err, result) {
        if (err) {
            res.status(500).json({
                error: true,
                description: "Internal server error",
                statusCode: 500
            })
        } else {
            if (result.docs.length > 0) {
                res.status(200).json(result.docs[0].stores[id]);
            } else {
                res.status(404).json({
                    error: true,
                    description: "Not Found",
                    statusCode: 404
                });
            }

        }

    })
});






http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});