import e, { Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';

import { Result } from 'types/Result';
import { Passenger } from 'types/Passenger';

dotenv.config();

export class ScanApi {

    /**
     * Get all scans for a specific voyageId. CUSTOM_API_URL must be provided.
    */
    public static async getByVoyageIdHandler(req: Request, res: Response) {
        try {
            const id = req.params.id;

            const response = await axios.get(`${process.env.CUSTOM_API_URL}/passenger-list/${id}`);

            if (response.data.status != 'success') {
                throw new Error('Invalid passenger data');
            }

            res.status(200).json(<Result<Passenger[]>>{
                status: 'success',
                data: response.data.data.map((scan: Passenger) => {
                    return <Passenger>{
                        firstName: scan.firstName,
                        lastName: scan.lastName,
                        dateOfBirth: scan.dateOfBirth,
                        gender: scan.gender,
                        homeCountry: scan.homeCountry,
                    };
                }),
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).json(<Result>{
                status: 'error',
                message: 'An error has occurred',
            });
        }
    };

    /**
     * Scan a passenger and assign a voyageId to it. CUSTOM_API_URL must be provided.
    */
    public static async scanTicketHandler(req: Request, res: Response) {
        try {
            const data = req.body;
            const response = await axios.put(
                process.env.CUSTOM_API_URL + '/scan',
                {
                    data: {
                        voyageId: data.voyageId,
                        customData: data.customData,
                    },
                }
            );

            if (response.data.status != 'success') {
                throw new Error('Invalid passenger data');
            }

            const passengers = response.data.data;
            const passengersArray = (passengers instanceof Array) ? passengers : (passengers ? [passengers] : []);

            res.status(200).json(<Result<Passenger[]>>{
                status: 'success',
                message: 'Created successfully',
                data: passengersArray.map((passenger: Passenger) => {
                    return <Passenger>{
                        firstName: passenger.firstName,
                        lastName: passenger.lastName,
                        dateOfBirth: passenger.dateOfBirth,
                        gender: passenger.gender,
                        homeCountry: passenger.homeCountry,
                        emergencyContactNumber: passenger.emergencyContactNumber,
                        specialCareOrAssistance: passenger.specialCareOrAssistance,
                    };
                }),
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).json(<Result>{
                status: 'error',
                message: 'An error has occurred',
            });
        }
    };

    /**
     * Scan a passenger and assign a voyageId to it. CUSTOM_API_URL must be provided.
    */
    public static async scanOcrHandler(req: Request, res: Response) {
        try {
            const data = req.body;
            const response = await axios.post(
                process.env.CUSTOM_API_URL + '/scan',
                {
                    data: {
                        voyageId: data.voyageId,
                        customData: data.customData,
                    }
                },
            );
            if (response.data.status != 'success') {
                throw new Error('Invalid passenger data');
            }
            const passengers = response.data.data;
            const passengersArray = (passengers instanceof Array) ? passengers : (passengers ? [passengers] : []);

            res.status(200).json(<Result<Passenger[]>>{
                status: 'success',
                message: 'Created successfully',
                data: passengersArray.map((passenger: Passenger) => {
                    return <Passenger>{
                        firstName: passenger.firstName,
                        lastName: passenger.lastName,
                        dateOfBirth: passenger.dateOfBirth,
                        gender: passenger.gender,
                        homeCountry: passenger.homeCountry,
                        emergencyContactNumber: passenger.emergencyContactNumber,
                        specialCareOrAssistance: passenger.specialCareOrAssistance,
                    };
                }),
            });
        } catch (error) {
            if (process.env.LOG_LEVEL === 'debug') {
                console.debug(error);
            };
            res.status(400).json(<Result>{
                status: 'error',
                message: 'An error has occurred',
            });
        }
    }
}