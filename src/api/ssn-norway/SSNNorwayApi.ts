import { Request, Response } from "express";
import axios, { AxiosRequestConfig } from "axios";
import { XMLParser, XmlBuilderOptions } from "fast-xml-parser";
import dotenv from "dotenv";
import Sendgrid from '@sendgrid/mail';

import { Result } from "types/Result";
import { ApiError } from "types/errors/ApiError";
import { Passenger } from "types/Passenger";
import { Voyage } from "types/Voyage";
import { ShipIdentification } from "types/ShipIdentification";
import { SSNNorwayHelper } from "./SSNNorwayHelper";

dotenv.config();

Sendgrid.setApiKey(process.env.SENDGRID_API_KEY!);

const options = <XmlBuilderOptions>{
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
};
const parser = new XMLParser(options);


export class SSNNorwayApi {
    static serviceUrl = "https://testapi.shiprep.no/SSNExternalWebservice3/SSNNorway.svc";
    static actionUrl = "https://shiprep.no/ws/2018/02/26/ISSNNorwayService";

    private static _passengersToTable(passengers: Passenger[]) {
        const headers = Object.keys(passengers[0]);
        const headerRow = headers.map(header => `<th>${header}</th>`).join('');
        const bodyRows = passengers.map((row: any) => {
            const cells = headers.map(header => `<td>${row[header] ?? 'N/A'}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        return `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }

    /**
     * Get a voyage from SSNNorway by voyage id.
     *
     * @param id VoyageId, see https://shiprep.no/ for more info.
     */
    public static async getVoyageById(voyageId: string): Promise<any> {
        try {
            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    "Content-Type": "text/xml;charset=UTF-8",
                    SOAPAction: `${SSNNorwayApi.actionUrl}/Voyage3Request`,
                },
            };

            const xml = SSNNorwayHelper.buildVoyage3RequestXML(voyageId);
            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError("Failed to get voyage");
            }

            const parsedData = await parser.parse(data.data);
            const statusMessage =
                parsedData["s:Envelope"]["s:Body"]["Voyage3RequestResponse"][
                "Voyage3RequestResult"
                ]["Response"]["a:StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage["#text"]);
            }

            return parsedData["s:Envelope"]["s:Body"]["Voyage3RequestResponse"][
                "Voyage3RequestResult"
            ]["Body"]["Notification"];
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            throw error instanceof ApiError ? error : new ApiError("An error has occurred");
        }
    }

    public static async getShipInfo({ callSign, imoNo, mmsiNo, shipName }: {
        callSign?: string;
        imoNo?: string;
        mmsiNo?: string;
        shipName?: string;
    }): Promise<ShipIdentification> {
        try {
            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    "Content-Type": "text/xml;charset=UTF-8",
                    SOAPAction: `${SSNNorwayApi.actionUrl}/ShipRequest`,
                },
            };

            const xml = SSNNorwayHelper.buildShipRequestXML({ shipName, callSign, imoNo, mmsiNo });
            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError("Failed to get voyages");
            }

            const parsedData = await parser.parse(data.data);
            const statusMessage =
                parsedData["s:Envelope"]["s:Body"]["ShipRequestResponse"][
                "ShipRequestResult"
                ]["a:Header"]["a:StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage);
            }

            const shipIdentification =
                parsedData["s:Envelope"]["s:Body"]["ShipRequestResponse"][
                "ShipRequestResult"
                ]["a:Body"]["a:NotificationDetails"]["a:ShipInformationType"][
                "a:ShipIdentification"
                ];

            return <ShipIdentification>{
                callSign: shipIdentification["a:CallSign"],
                imoNo: shipIdentification["a:ImoNo"]?.toString(),
                mmsiNo: shipIdentification["a:MmsiNo"]?.toString(),
                shipName: shipIdentification["a:ShipName"],
                shipId: shipIdentification["a:ShipID"]?.toString(),
            };
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            throw error instanceof ApiError ? error : new ApiError("An error has occurred");
        }
    }

    /**
     * Build a SOAP request to get all scan lists from SSNNorway.
     *
     * See https://shiprep.no/ for more info.
     */
    public static async getVoyagesByNameHandler(req: Request, res: Response) {
        try {
            const shipName = req.params.name;

            if (!shipName) {
                throw new ApiError("Invalid ship name");
            }

            /* get ship id by ship name from SSNN */
            const shipIdentification = await SSNNorwayApi.getShipInfo({
                shipName: shipName,
            });

            if (!shipIdentification) {
                throw new ApiError("Invalid ship name");
            }

            /* get voyages by ship id from SSNN */
            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    "Content-Type": "text/xml;charset=UTF-8",
                    SOAPAction: `${SSNNorwayApi.actionUrl}/VoyageRequest`,
                },
            };

            const xml = SSNNorwayHelper.buildVoyageRequestXML(
                shipIdentification.shipId
            );
            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError("Failed to get voyages");
            }

            const parsedData = await parser.parse(data.data);
            const statusMessage =
                parsedData["s:Envelope"]["s:Body"]["VoyageRequestResponse"][
                "VoyageRequestResult"
                ]["Header"]["StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage);
            }

            const voyages =
                parsedData["s:Envelope"]["s:Body"]["VoyageRequestResponse"][
                "VoyageRequestResult"
                ]["Body"]["NotificationDetails"]["VoyageNotificationDetail2Type"];

            const voyagesArray =
                voyages instanceof Array ? voyages : voyages ? [voyages] : [];

            res.status(200).json(<
                Result<{ shipIdentification: ShipIdentification; voyages: Voyage[] }>
                >{
                    status: "success",
                    data: {
                        shipIdentification,
                        voyages: voyagesArray.map((voyage: any) => {
                            const _voyage = voyage["VoyageInformation"];
                            return <Voyage>{
                                id: _voyage["VoyageID"]?.["#text"]?.toString(),
                                departureETD: _voyage["DepartureETD"]?.["#text"]?.toString(),
                                departureLocationLocode:
                                    _voyage["DepartureLocation"]?.["Locode"]?.toString(),
                                departureLocationName:
                                    _voyage["DepartureLocation"]?.["CouncilName"]?.toString(),
                                arrivalETA: _voyage["ArrivalETA"]?.["#text"]?.toString(),
                                arrivalETD: _voyage["ArrivalETD"]?.["#text"]?.toString(),
                                arrivalLocationLocode:
                                    _voyage["ArrivalLocation"]?.["Locode"]?.toString(),
                                arrivalLocationName:
                                    _voyage["ArrivalLocation"]?.["CouncilName"]?.toString(),
                            };
                        }),
                    },
                });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            const message = error instanceof ApiError ? error.message : "An error has occurred";
            res.status(400).json(<Result>{
                status: "error",
                message: message,
            });
        }
    }

    /**
     * Build a SOAP request to get all scan lists from SSNNorway.
     * 
     * See https://shiprep.no/ for more info.
    */
    public static async getVoyagesByShipIdHandler(req: Request, res: Response) {
        try {
            const shipId = req.params.id;

            if (!shipId) {
                throw new ApiError('Invalid ship id');
            }

            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': `${SSNNorwayApi.actionUrl}/VoyageRequest`,
                }
            };

            const xml = SSNNorwayHelper.buildVoyageRequestXML(shipId);
            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError('Failed to get voyages');
            }

            const parsedData = await parser.parse(data.data);
            const statusMessage = parsedData["s:Envelope"]["s:Body"]["VoyageRequestResponse"]["VoyageRequestResult"]["Header"]["StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage);
            }

            const voyages = parsedData["s:Envelope"]["s:Body"]["VoyageRequestResponse"]["VoyageRequestResult"]["Body"]["NotificationDetails"]["VoyageNotificationDetail2Type"]
            const voyagesArray = (voyages instanceof Array) ? voyages : (voyages ? [voyages] : []);

            res.status(200).json(<Result<Voyage[]>>{
                status: 'success',
                data: voyagesArray.map((voyage: any) => {
                    const _voyage = voyage["VoyageInformation"];
                    return <Voyage>{
                        id: _voyage["VoyageID"]?.["#text"]?.toString(),
                        name: _voyage["NoOfPassengers"]?.["#text"]?.toString(),
                        departureETD: _voyage["DepartureETD"]?.["#text"]?.toString(),
                        departureLocationLocode: _voyage["DepartureLocation"]?.["Locode"]?.toString(),
                        departureLocationName: _voyage["DepartureLocation"]?.["CouncilName"]?.toString(),
                        arrivalETA: _voyage["ArrivalETA"]?.["#text"]?.toString(),
                        arrivalETD: _voyage["ArrivalETD"]?.["#text"]?.toString(),
                        arrivalLocationLocode: _voyage["ArrivalLocation"]?.["Locode"]?.toString(),
                        arrivalLocationName: _voyage["ArrivalLocation"]?.["CouncilName"]?.toString(),
                    }
                }),
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            const message = error instanceof ApiError ? error.message : 'An error has occurred';
            res.status(400).json(<Result>{
                status: 'error',
                message: message,
            });
        }
    }

    /**
     * Build a SOAP request from a scan list and send to SSNNorway.
     * 
     * Attempts to create a new voyge in SSNNorway if no voyage id exists, otherwise updates existing voyage.
     * See https://shiprep.no/ for more info.
    */
    public static async publishHandler(req: Request, res: Response) {
        try {
            const id = req.params.id;

            /* get current voyage from SSNN */
            const voyageNotification = await SSNNorwayApi.getVoyageById(id);

            /* get passengers from external source */
            const response = await axios.get(`${process.env.CUSTOM_API_URL}/passenger-list/${id}`);

            if (response.data.status != 'success') {
                throw new ApiError('Invalid passenger data');
            }

            const passengers = response.data.data;
            const passengersArray = (passengers instanceof Array) ? passengers : (passengers ? [passengers] : []);
            const passengersArrayParsed = passengersArray.map((passenger: Passenger) => {
                return <Passenger>{
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    dateOfBirth: passenger.dateOfBirth,
                    gender: passenger.gender,
                    homeCountry: passenger.homeCountry,
                    emergencyContactNumber: passenger.emergencyContactNumber,
                    specialCareOrAssistance: passenger.specialCareOrAssistance,
                };
            });

            /* create or update voyage in SSNN */
            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': `${SSNNorwayApi.actionUrl}/VoyageNotification`,
                }
            };
            const xml = SSNNorwayHelper.buildVoyageNotificationXML(voyageNotification ?? null, passengersArrayParsed ?? []);

            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError('Failed to create voyage');
            }

            const parsedData = await parser.parse(data.data);
            const voyageNotificationResult = parsedData["s:Envelope"]["s:Body"]["VoyageNotificationResponse"]["VoyageNotificationResult"];
            const statusMessage = voyageNotificationResult["StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage["#text"]);
            }

            /* send passenger list to land side */
            const emailTo = process.env.LANDSIDE_EMAIL;
            const emailFrom = process.env.SENDGRID_EMAIL;

            if (emailTo && emailFrom) {
                const departureETD = voyageNotification?.["VoyageItinerary"]?.["DepartureETD"];
                const arrivalLocation = voyageNotification?.["VoyageItinerary"]?.["ArrivalLocation"]?.["a:LocationLocode"];
                const departureLocation = voyageNotification?.["VoyageItinerary"]?.["DepartureLocation"]?.["a:LocationLocode"];
                const msg = {
                    to: emailTo,
                    from: emailFrom,
                    subject: `PASSENGERS ${departureETD} ${departureLocation} - ${arrivalLocation}`,
                    html: SSNNorwayApi._passengersToTable(passengersArrayParsed),
                }

                await Sendgrid.send(msg);
            }

            res.status(200).json(<Result<string>>{
                status: 'success',
                message: 'Voyage published successfully',
            });
        } catch (error: any) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            const message = error instanceof ApiError ? error.message : 'An error has occurred';
            res.status(400).json(<Result>{
                status: 'error',
                message: message,
            });
        }
    }

    public static async publishNewHandler(req: Request, res: Response) {
        try {
            /* create or update voyage in SSNN */
            const axiosConfig = <AxiosRequestConfig>{
                headers: {
                    'Content-Type': 'text/xml;charset=UTF-8',
                    'SOAPAction': `${SSNNorwayApi.actionUrl}/VoyageNotification`,
                }
            };
            const xml = SSNNorwayHelper.buildVoyageNotificationXML(null, []);

            const data = await axios.post(SSNNorwayApi.serviceUrl, xml, axiosConfig);

            if (data.status !== 200) {
                throw new ApiError('Failed to create voyage');
            }

            const parsedData = await parser.parse(data.data);
            const voyageNotificationResult = parsedData["s:Envelope"]["s:Body"]["VoyageNotificationResponse"]["VoyageNotificationResult"];
            const statusMessage = voyageNotificationResult["StatusMessage"];

            if (statusMessage["@_i:nil"] !== "true") {
                throw new ApiError(statusMessage["#text"]);
            }

            res.status(200).json(<Result<string>>{
                status: 'success',
                message: 'Voyage published successfully',
            });
        } catch (error: any) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            const message = error instanceof ApiError ? error.message : 'An error has occurred';
            res.status(400).json(<Result>{
                status: 'error',
                message: message,
            });
        }
    }
}