import { XMLBuilder, XmlBuilderOptions } from "fast-xml-parser";
import { Passenger } from "types/Passenger";

const options = <XmlBuilderOptions>{
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
};
const builder = new XMLBuilder(options);

export class SSNNorwayHelper {
    private static _buildHeaderXML() {
        return {
            "ns1:Password": process.env.SSN_NORWAY_PASSWORD,
            "ns1:UserName": "ssn.no_webservice@kustevent.com",
        }
    }

    /** Order of fields is important. */
    private static _toSoapXMLPassenger(passenger: Passenger) {
        const isYearFirst = passenger.dateOfBirth.indexOf('-') === 4;

        const _passenger: any = {
            "ns:DateOfBirth": isYearFirst ? passenger.dateOfBirth : SSNNorwayHelper._reverseDOB(passenger.dateOfBirth),
            "ns:FirstName": passenger.firstName,
            "ns:Gender": passenger.gender?.toUpperCase(),
            "ns:HomeCountry": passenger.homeCountry?.toUpperCase(),
            "ns:LastName": passenger.lastName,
            "ns:MusterStatus": "ONBOARD",
            "ns:NationalIdNumber": "N/A",
        }

        if (passenger.emergencyContactNumber) {
            _passenger["ns:EmergencyContactNumber"] = passenger.emergencyContactNumber;
        }

        if (passenger.specialCareOrAssistance) {
            _passenger["ns:SpecialCareOrAssistance"] = passenger.specialCareOrAssistance;
        }

        return _passenger;
    }

    private static _reverseDOB(dob: string) {
        const parts = dob.split('-');
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    public static buildVoyage3RequestXML(voyageId: string) {
        const xmlObject = {
            "soapenv:Envelope": {
                "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                "@_xmlns:ns": "https://shiprep.no/ws/2018/02/26",
                "@_xmlns:ns1": "https://shiprep.no/ws/2018/02/19",
                "soapenv:Header": {},
                "soapenv:Body": {
                    "ns:Voyage3Request": {
                        "ns:shipRepPilotageStatusRequest": {
                            "ns1:Header": SSNNorwayHelper._buildHeaderXML(),
                            "ns1:VoyageId": voyageId,
                        },
                    }
                }
            }
        };

        return builder.build(xmlObject);
    }

    public static buildVoyageNotificationXML(voyageNotification: any, passengers: Passenger[]) {
        const departureETD = new Date();
        const arrivalETA = new Date();
        const arrivalETD = new Date();
        departureETD.setHours(departureETD.getHours() + 1);
        departureETD.setDate(departureETD.getDate() + 30);
        arrivalETA.setDate(arrivalETA.getDate() + 30);
        arrivalETA.setHours(arrivalETA.getHours() + 2);
        arrivalETD.setDate(arrivalETD.getDate() + 30);
        arrivalETD.setHours(arrivalETD.getHours() + 3);
        const xmlObject = {
            "soapenv:Envelope": {
                "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                "@_xmlns:ns": "https://shiprep.no/ws/2018/02/26",
                "@_xmlns:ns1": "https://shiprep.no/ws/2018/02/19",
                "soapenv:Header": {},
                "soapenv:Body": {
                    "ns:VoyageNotification": {
                        "ns:ShipRep_Not": {
                            "ns1:Header": SSNNorwayHelper._buildHeaderXML(),
                            "ns:Body": {
                                "ns:Notification": {
                                    "ns1:VesselIdentification": {
                                        "ns1:ImoNo": voyageNotification?.["VesselIdentification"]?.["ImoNo"] ?? 9056313,
                                    },
                                    "ns1:VoyageID": voyageNotification?.["VoyageID"] ?? 0,
                                    "ns:PassengerList": {
                                        "ns:PassengerType":
                                            passengers.map((passenger: Passenger) => SSNNorwayHelper._toSoapXMLPassenger(passenger)) ?? [],
                                    },
                                    "ns:VoyageDetails": {
                                        "ns:NoOfCrew": voyageNotification?.["VoyageDetails"]?.["NoOfCrew"] ?? 1,
                                        "ns:NoOfPassengers": passengers.length ?? 0,
                                        "ns:VoyagePurpose": {
                                            "ns1:VoyagePurposeEnumType": voyageNotification?.["VoyageDetails"]?.["VoyagePurpose"]?.["a:VoyagePurposeEnumType"] ?? "CRUISING"
                                        },
                                    },
                                    "ns:VoyageItinerary": {
                                        "ns:ArrivalETA": voyageNotification?.["VoyageItinerary"]?.["ArrivalETA"] ?? arrivalETA.toISOString().substring(0, 19),
                                        "ns:ArrivalETAIsActual": voyageNotification?.["VoyageItinerary"]?.["ArrivalETAIsActual"] ?? false,
                                        "ns:ArrivalETD": voyageNotification?.["VoyageItinerary"]?.["ArrivalETD"] ?? arrivalETD.toISOString().substring(0, 19),
                                        "ns:ArrivalLocation": {
                                            "ns1:LocationLocode": voyageNotification?.["VoyageItinerary"]?.["ArrivalLocation"]?.["a:LocationLocode"] ?? "NOLOD",
                                        },
                                        "ns:DepartureETD": voyageNotification?.["VoyageItinerary"]?.["DepartureETD"] ?? departureETD.toISOString().substring(0, 19),
                                        "ns:DepartureETDIsActual": voyageNotification?.["VoyageItinerary"]?.["DepartureETDIsActual"] ?? false,
                                        "ns:DepartureLocation": {
                                            "ns1:LocationLocode": voyageNotification?.["VoyageItinerary"]?.["DepartureLocation"]?.["a:LocationLocode"] ?? "NOBON",
                                        }

                                    }
                                }
                            },
                        }
                    }
                }
            }
        };
        return builder.build(xmlObject);
    }

    public static buildVoyageRequestXML(shipId: string) {
        const xmlObject = {
            "soapenv:Envelope": {
                "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                "@_xmlns:ns": "https://shiprep.no/ws/2018/02/26",
                "@_xmlns:ns1": "https://shiprep.no/ws/2018/02/19",
                "soapenv:Header": {},
                "soapenv:Body": {
                    "ns:VoyageRequest": {
                        "ns:req": {
                            "ns1:Header": SSNNorwayHelper._buildHeaderXML(),
                            "ns1:Body": {
                                "ns1:SearchCriteria": {
                                    "ns1:SafeSeaNetShipId": shipId,
                                }
                            }
                        },
                    }
                }
            }
        };

        return builder.build(xmlObject);
    }

    public static buildShipRequestXML({ callSign, imoNo, mmsiNo, shipName }: {
        callSign?: string;
        imoNo?: string;
        mmsiNo?: string;
        shipName?: string;
    }) {
        const xmlObject = {
            "soapenv:Envelope": {
                "@_xmlns:soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
                "@_xmlns:ns": "https://shiprep.no/ws/2018/02/26",
                "@_xmlns:ns1": "https://shiprep.no/ws/2018/02/19",
                "soapenv:Header": {},
                "soapenv:Body": {
                    "ns:ShipRequest": {
                        "ns:req": {
                            "ns1:Header": SSNNorwayHelper._buildHeaderXML(),
                            "ns1:Body": {
                                "ns1:SearchCriteria": {
                                    "ns1:CallSign": callSign,
                                    "ns1:ImoNumber": imoNo,
                                    "ns1:MmsiNumber": mmsiNo,
                                    "ns1:ShipName": shipName,
                                },
                            },
                        },
                    },
                },
            },
        };

        return builder.build(xmlObject);
    }
}