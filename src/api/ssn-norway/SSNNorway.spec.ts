import { createRequest, createResponse } from "node-mocks-http";
import dotenv from "dotenv";

import { SSNNorwayApi } from "./SSNNorwayApi";
import { Passenger } from "types/Passenger";

dotenv.config();

const VOYAGE_ID = "2190931";
const SHIP_ID = "259622";
const SHIP_NAME = "HAMAROY";

const Sendgrid = require("@sendgrid/mail");

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

jest.mock("axios", () => ({
  get: jest.fn((url) => {
    if (url === `${process.env.CUSTOM_API_URL}/passenger-list/${VOYAGE_ID}`) {
      return Promise.resolve({
        data: {
          status: "success",
          data: <Passenger[]>[
            {
              firstName: "Magnus",
              lastName: "Midtbø",
              dateOfBirth: "1988-11-18",
              gender: "MALE",
              homeCountry: "NORWAY",
              musterStatus: "ONBOARD",
            },
            {
              firstName: "Bjarne",
              lastName: "Betjent",
              dateOfBirth: "1951-04-01",
              gender: "MALE",
              homeCountry: "NORWAY",
              musterStatus: "ONBOARD",
              emergencyContactNumber: "113",
              specialCareOrAssistance: "Litt tungnem",
            },
          ],
        },
      });
    }

    return Promise.resolve({ status: 400 });
  }),
  post: jest.fn((url, body, options) => {
    if (url === SSNNorwayApi.serviceUrl) {
      const soapAction = options.headers["SOAPAction"];
      if (
        soapAction === `${SSNNorwayApi.actionUrl}/Voyage3Request` &&
        _isVoyage3RequestXML(body)
      ) {
        return Promise.resolve({
          status: 200,
          data:
            `<s:Envelope>` +
            `<s:Body>` +
            `<Voyage3RequestResponse>` +
            `<Voyage3RequestResult>` +
            `<Body>` +
            `<Notification>` +
            `<ShipIdentification>` +
            `<ImoNo>9056313</ImoNo>` +
            `</ShipIdentification>` +
            `<VoyageID>${VOYAGE_ID}</VoyageID>` +
            `<VoyageDetails>` +
            `<NoOfCrew>1</NoOfCrew>` +
            `<VoyagePurpose>` +
            `<a:VoyagePurposeEnumType>CRUISING</a:VoyagePurposeEnumType>` +
            `</VoyagePurpose>` +
            `</VoyageDetails>` +
            `<VoyageItinerary>` +
            `<ArrivalETA>2023-12-25T09:00:00</ns:ArrivalETA>` +
            `<ArrivalETAIsActual>false</ns:ArrivalETAIsActual>` +
            `<ArrivalETD>2023-12-25T11:30:00</ns:ArrivalETD>` +
            `<ArrivalLocation>` +
            `<a:LocationLocode>NOLOD</ns1:LocationLocode>` +
            `</ArrivalLocation>` +
            `<DepartureETD>2023-12-25T07:30:00</ns:DepartureETD>` +
            `<DepartureETDIsActual>false</ns:DepartureETDIsActual>` +
            `<DepartureLocation>` +
            `<a:LocationLocode>NOBON</ns1:LocationLocode>` +
            `</DepartureLocation>` +
            `</VoyageItinerary>` +
            `</Notification>` +
            `</Body>` +
            `<Response>` +
            `<a:StatusMessage i:nil="true"/>` +
            `</Response>` +
            `</Voyage3RequestResult>` +
            `</Voyage3RequestResponse>` +
            `</s:Body>` +
            `</s:Envelope>`,
        });
      } else if (
        soapAction === `${SSNNorwayApi.actionUrl}/ShipRequest` &&
        _isShipRequestXML(body)
      ) {
        return Promise.resolve({
          status: 200,
          data:
            `<s:Envelope>` +
            `<s:Body>` +
            `<ShipRequestResponse>` +
            `<ShipRequestResult>` +
            `<a:Header>` +
            `<a:StatusMessage i:nil="true"/>` +
            `</a:Header>` +
            `<a:Body>` +
            `<a:NotificationDetails>` +
            `<a:ShipInformationType>` +
            `<a:ShipIdentification>` +
            `<a:ShipID>${SHIP_ID}</a:ShipID>` +
            `</a:ShipIdentification>` +
            `</a:ShipInformationType>` +
            `</a:NotificationDetails>` +
            `</a:Body>` +
            `</ShipRequestResult>` +
            `</ShipRequestResponse>` +
            `</s:Body>` +
            `</s:Envelope>`,
        });
      } else if (
        soapAction === `${SSNNorwayApi.actionUrl}/VoyageRequest` &&
        _isVoyageRequestXML(body)
      ) {
        return Promise.resolve({
          status: 200,
          data:
            `<s:Envelope>` +
            `<s:Body>` +
            `<VoyageRequestResponse>` +
            `<VoyageRequestResult>` +
            `<Header>` +
            `<StatusMessage i:nil="true"/>` +
            `</Header>` +
            `<Body>` +
            `<NotificationDetails>` +
            `<VoyageNotificationDetail2Type>` +
            `<VoyageInformation>` +
            `<VoyageID xmlns="https://shiprep.no/ws/2018/02/19">${VOYAGE_ID}</VoyageID>` +
            `</VoyageInformation>` +
            `</VoyageNotificationDetail2Type>` +
            `</NotificationDetails>` +
            `</Body>` +
            `</VoyageRequestResult>` +
            `</VoyageRequestResponse>` +
            `</s:Body>` +
            `</s:Envelope>`,
        });
      } else if (
        soapAction === `${SSNNorwayApi.actionUrl}/VoyageNotification` &&
        _isVoyageNotificationXML(body)
      ) {
        return Promise.resolve({
          status: 200,
          data:
            `<s:Envelope>` +
            `<s:Body>` +
            `<VoyageNotificationResponse>` +
            `<VoyageNotificationResult>` +
            `<StatusMessage i:nil="true"/>` +
            `<VoyageID>${VOYAGE_ID}</VoyageID>` +
            `</VoyageNotificationResult>` +
            `</VoyageNotificationResponse>` +
            `</s:Body>` +
            `</s:Envelope>`,
        });
      }
    }

    return Promise.resolve({ status: 400 });
  }),
}));

function _buildHeaderXML() {
  return (
    `<ns1:Header>` +
    `<ns1:Password>${process.env.SSN_NORWAY_PASSWORD}</ns1:Password>` +
    `<ns1:UserName>ssn.no_webservice@kustevent.com</ns1:UserName>` +
    `</ns1:Header>`
  );
}

function _isVoyage3RequestXML(xml: string) {
  const expected =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="https://shiprep.no/ws/2018/02/26" xmlns:ns1="https://shiprep.no/ws/2018/02/19">` +
    `<soapenv:Header></soapenv:Header>` +
    `<soapenv:Body>` +
    `<ns:Voyage3Request>` +
    `<ns:shipRepPilotageStatusRequest>` +
    _buildHeaderXML() +
    `<ns1:VoyageId>2190931</ns1:VoyageId>` +
    `</ns:shipRepPilotageStatusRequest>` +
    `</ns:Voyage3Request>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;
  expect(xml).toEqual(expected);
  return xml === expected;
}

function _isShipRequestXML(xml: string): boolean {
  const expected =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="https://shiprep.no/ws/2018/02/26" xmlns:ns1="https://shiprep.no/ws/2018/02/19">` +
    `<soapenv:Header></soapenv:Header>` +
    `<soapenv:Body>` +
    `<ns:ShipRequest>` +
    `<ns:req>` +
    _buildHeaderXML() +
    `<ns1:Body>` +
    `<ns1:SearchCriteria>` +
    `<ns1:ShipName>${SHIP_NAME}</ns1:ShipName>` +
    `</ns1:SearchCriteria>` +
    `</ns1:Body>` +
    `</ns:req>` +
    `</ns:ShipRequest>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;
  expect(xml).toEqual(expected);
  return xml === expected;;
}

function _isVoyageRequestXML(xml: string): boolean {
  const expected =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="https://shiprep.no/ws/2018/02/26" xmlns:ns1="https://shiprep.no/ws/2018/02/19">` +
    `<soapenv:Header></soapenv:Header>` +
    `<soapenv:Body>` +
    `<ns:VoyageRequest>` +
    `<ns:req>` +
    _buildHeaderXML() +
    `<ns1:Body>` +
    `<ns1:SearchCriteria>` +
    `<ns1:SafeSeaNetShipId>${SHIP_ID}</ns1:SafeSeaNetShipId>` +
    `</ns1:SearchCriteria>` +
    `</ns1:Body>` +
    `</ns:req>` +
    `</ns:VoyageRequest>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;
  expect(xml).toEqual(expected);
  return xml === expected;
}

function _isVoyageNotificationXML(xml: string): boolean {
  const expected =
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="https://shiprep.no/ws/2018/02/26" xmlns:ns1="https://shiprep.no/ws/2018/02/19">` +
    `<soapenv:Header></soapenv:Header>` +
    `<soapenv:Body>` +
    `<ns:VoyageNotification>` +
    `<ns:ShipRep_Not>` +
    _buildHeaderXML() +
    `<ns:Body>` +
    `<ns:Notification>` +
    `<ns1:VesselIdentification>` +
    `<ns1:ImoNo>9056313</ns1:ImoNo>` +
    `</ns1:VesselIdentification>` +
    `<ns1:VoyageID>${VOYAGE_ID}</ns1:VoyageID>` +
    `<ns:PassengerList>` +
    `<ns:PassengerType>` +
    `<ns:DateOfBirth>1988-11-18</ns:DateOfBirth>` +
    `<ns:FirstName>Magnus</ns:FirstName>` +
    `<ns:Gender>MALE</ns:Gender>` +
    `<ns:HomeCountry>NORWAY</ns:HomeCountry>` +
    `<ns:LastName>Midtbø</ns:LastName>` +
    `<ns:MusterStatus>ONBOARD</ns:MusterStatus>` +
    `<ns:NationalIdNumber>N/A</ns:NationalIdNumber>` +
    `</ns:PassengerType>` +
    `<ns:PassengerType>` +
    `<ns:DateOfBirth>1951-04-01</ns:DateOfBirth>` +
    `<ns:FirstName>Bjarne</ns:FirstName>` +
    `<ns:Gender>MALE</ns:Gender>` +
    `<ns:HomeCountry>NORWAY</ns:HomeCountry>` +
    `<ns:LastName>Betjent</ns:LastName>` +
    `<ns:MusterStatus>ONBOARD</ns:MusterStatus>` +
    `<ns:NationalIdNumber>N/A</ns:NationalIdNumber>` +
    `<ns:EmergencyContactNumber>113</ns:EmergencyContactNumber>` +
    `<ns:SpecialCareOrAssistance>Litt tungnem</ns:SpecialCareOrAssistance>` +
    `</ns:PassengerType>` +
    `</ns:PassengerList>` +
    `<ns:VoyageDetails>` +
    `<ns:NoOfCrew>1</ns:NoOfCrew>` +
    `<ns:NoOfPassengers>2</ns:NoOfPassengers>` +
    `<ns:VoyagePurpose>` +
    `<ns1:VoyagePurposeEnumType>CRUISING</ns1:VoyagePurposeEnumType>` +
    `</ns:VoyagePurpose>` +
    `</ns:VoyageDetails>` +
    `<ns:VoyageItinerary>` +
    `<ns:ArrivalETA>2023-12-25T09:00:00</ns:ArrivalETA>` +
    `<ns:ArrivalETAIsActual>false</ns:ArrivalETAIsActual>` +
    `<ns:ArrivalETD>2023-12-25T11:30:00</ns:ArrivalETD>` +
    `<ns:ArrivalLocation>` +
    `<ns1:LocationLocode>NOLOD</ns1:LocationLocode>` +
    `</ns:ArrivalLocation>` +
    `<ns:DepartureETD>2023-12-25T07:30:00</ns:DepartureETD>` +
    `<ns:DepartureETDIsActual>false</ns:DepartureETDIsActual>` +
    `<ns:DepartureLocation>` +
    `<ns1:LocationLocode>NOBON</ns1:LocationLocode>` +
    `</ns:DepartureLocation>` +
    `</ns:VoyageItinerary>` +
    `</ns:Notification>` +
    `</ns:Body>` +
    `</ns:ShipRep_Not>` +
    `</ns:VoyageNotification>` +
    `</soapenv:Body>` +
    `</soapenv:Envelope>`;
  expect(xml).toEqual(expected);
  return xml === expected;
}

describe("SSNNorwayApi", () => {
  it("can get a voyage by id", async () => {
    const res = await SSNNorwayApi.getVoyageById("2190931");
    expect(res).toBeDefined();
  });

  it("can get ship info by name from SSNN", async () => {
    const shipIdentification = await SSNNorwayApi.getShipInfo({
      shipName: SHIP_NAME,
    });

    expect(shipIdentification.shipId.toString()).toEqual(SHIP_ID);
  });

  it("can get voyages by ship name from SSNN", async () => {
    const res = createResponse();
    const req = createRequest({ params: { name: SHIP_NAME } });

    await SSNNorwayApi.getVoyagesByNameHandler(req, res);

    const data = res._getJSONData();

    expect(data.status).toEqual("success");
    expect(data.data).toEqual(
      {
        shipIdentification: expect.objectContaining({ shipId: SHIP_ID }),
        voyages: expect.arrayContaining([expect.objectContaining({ id: VOYAGE_ID })])
      }
    );
  });

  // TODO: fix datetime and matching data
  it.skip("can publish a voyage to SSNN", async () => {
    const res = createResponse();
    const req = createRequest({ params: { id: VOYAGE_ID } });

    await SSNNorwayApi.publishHandler(req, res);

    const data = res._getJSONData();
    expect(Sendgrid.send).toHaveBeenNthCalledWith(1,
      expect.objectContaining({
        to: process.env.LANDSIDE_EMAIL,
        from: process.env.SENDGRID_EMAIL,
        html:
          '<table>' +
          '<thead>' +
          '<tr><th>firstName</th><th>lastName</th><th>dateOfBirth</th><th>gender</th><th>homeCountry</th><th>emergencyContactNumber</th><th>specialCareOrAssistance</th></tr>' +
          '</thead>' +
          '<tbody>' +
          '<tr><td>Magnus</td><td>Midtbø</td><td>1988-11-18</td><td>MALE</td><td>NORWAY</td><td>N/A</td><td>N/A</td></tr>' +
          '<tr><td>Bjarne</td><td>Betjent</td><td>1951-04-01</td><td>MALE</td><td>NORWAY</td><td>113</td><td>Litt tungnem</td></tr>' +
          '</tbody>' +
          '</table>'
      }));
    expect(data.status).toEqual("success");
  }, 10000);
});
