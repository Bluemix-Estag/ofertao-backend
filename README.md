# Carrefour Node.js back-end

## Direct use of APIs

### Search near stores

```
    POST: /getNearStores
```

  Near Stores references by lat / long

#### Using lat / long coordinates:

Request Body

```
    {
        location: {
            latitude: -23.5754229,
	    longitude: -46.6528428,
            radius: 2000
        }
    }
```

| Property | Description |
| --- | --- |
| location | User location object. |
| latitude | location's latitude. |
| longitude | locations's longitude. |
| radius (optional) | radius/distance between user's location and stores. |


#### Using address:

Request Body

 ```
    {
        location:{
            address: "IBM tutoia",
            radius: 2000
        }
    }
 ```

| Property | Description |
| --- | --- |
| location | User's location object. |
| address | User's address as text |
| radius (optional) | radius/distance between user's location and stores. |


 >radius property is optional, use it to limit search with a specific radius/distance.

 Response

 ```
    {
        error : false,
        location: {
            latitude: -23.575,
            longitude: -46.123,
            radius: 2000
        },
        stores: [
            {
                id: "store_id",
                location:{
                    latitude:-23.575,
                    longitude: -46.123,
                },
                state: "state",
                city: "City",
                neighborhood: "neighborhood's name",
                street: "Street's name",
                number: "2318",
                complement: "",
                postalCode: "01317-002",
                name: "Store's name",
                initials: "XBP",
                phoneNumber: "",
                type: "0",
                favorited: false,
                isOpen: true,
                hasCoupons: false,
                hasPromotions: true,
                hasScan: false,
                foodEligible: false,
                distance: 1.97,
                all_promotions: [
                    {
                        id: "promotion_id",
                        brand: "",
                        campaign: "campaign's name",
                        startDate: "2017-06-21T03:00:00Z",
                        endDate: "2017-06-29T03:00:00Z",
                        category: "Product's category",
                        name: "Product's name",
                        description: "product's description",
                        unit: "product's unit",
                        region: "region",
                        dynamicTypeId: 4,
                        images: [
                            "Product's images"
                        ],
                        warning: "",
                        legalDescription: "Description",
                        isHighlight: true,
                        isMyCarrefour: false,
                        storeId: "759-0",
                        index: 0,
                        extraField: {
                            y: "3",
                            x: "4",
                            promotionalPrice: "1,09",
                            price: "1,45"
                        }
                    }
                ]
            }
        ]
    }
 ```

 > Stores property might be empty if there is no near store, also promotions