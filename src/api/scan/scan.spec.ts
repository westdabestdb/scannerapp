import { createRequest, createResponse } from "node-mocks-http";
import { ScanApi } from "./ScanApi";
import { Passenger } from "types/Passenger";

const VOYAGE_ID = '2190931';

jest.mock('axios', () => ({
    get: jest.fn((url) => {
        if (url === `${process.env.CUSTOM_API_URL}/passenger-list/${VOYAGE_ID}`) {
            return Promise.resolve({
                data: {
                    status: "success",
                    data: <Passenger[]>[
                        {
                            firstName: 'Magnus',
                            lastName: 'Midtbø',
                            dateOfBirth: '1988-11-18',
                            gender: 'MALE',
                            homeCountry: 'NORWAY',
                            musterStatus: 'ONBOARD',
                        }, {
                            firstName: 'Bjarne',
                            lastName: 'Betjent',
                            dateOfBirth: '1951-04-01',
                            gender: 'MALE',
                            homeCountry: 'NORWAY',
                            musterStatus: 'ONBOARD',
                            emergencyContactNumber: '113',
                            specialCareOrAssistance: 'Litt tungnem',
                        }
                    ]
                }
            });
        }

        return Promise.resolve({ status: 400 });
    }),
    put: jest.fn((url, body) => {
        if (url === `${process.env.CUSTOM_API_URL}/scan` && body.data.voyageId === VOYAGE_ID && body.data.customData) {
            return Promise.resolve({
                status: 200,
                data: {
                    status: "success",
                    data: <Passenger[]>[
                        {
                            firstName: 'Magnus',
                            lastName: 'Midtbø',
                            dateOfBirth: '1988-11-18',
                            gender: 'MALE',
                            homeCountry: 'NORWAY',
                        }, {
                            firstName: 'Bjarne',
                            lastName: 'Betjent',
                            dateOfBirth: '1951-04-01',
                            gender: 'MALE',
                            homeCountry: 'NORWAY',
                        }
                    ]
                }
            });
        }

        return Promise.resolve({ status: 400 });
    }),
    post: jest.fn((url, body) => {
        if (url === `${process.env.CUSTOM_API_URL}/scan` && body.data.voyageId === VOYAGE_ID && body.data.customData) {
            return Promise.resolve({
                status: 200,
                data: {
                    status: "success",
                    data: <Passenger[]>[
                        {
                            firstName: 'Magnus',
                            lastName: 'Midtbø',
                            dateOfBirth: '1988-11-18',
                            gender: 'MALE',
                            homeCountry: 'NORWAY',
                        }
                    ]
                }
            });
        }

        return Promise.resolve({ status: 400 });
    }),
}));

describe('ScanApi and ScanListApi', () => {
    it('can get scans for a specific voyageId', async () => {
        const res = createResponse();
        const req = createRequest({ params: { id: VOYAGE_ID } });

        await ScanApi.getByVoyageIdHandler(req, res);

        const data = res._getJSONData();

        expect(data.status).toEqual('success');
        expect(data.data).toEqual([
            {
                firstName: 'Magnus',
                lastName: 'Midtbø',
                dateOfBirth: '1988-11-18',
                gender: 'MALE',
                homeCountry: 'NORWAY',
            }, {
                firstName: 'Bjarne',
                lastName: 'Betjent',
                dateOfBirth: '1951-04-01',
                gender: 'MALE',
                homeCountry: 'NORWAY',
            }
        ]);
    });

    it('can handle a ticket scan', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                voyageId: VOYAGE_ID,
                customData: 'custom data',
            }
        });

        await ScanApi.scanTicketHandler(req, res);

        const data = res._getJSONData();

        expect(data.status).toEqual('success');
        expect(data.data).toEqual([
            {
                firstName: 'Magnus',
                lastName: 'Midtbø',
                dateOfBirth: '1988-11-18',
                gender: 'MALE',
                homeCountry: 'NORWAY',
            }, {
                firstName: 'Bjarne',
                lastName: 'Betjent',
                dateOfBirth: '1951-04-01',
                gender: 'MALE',
                homeCountry: 'NORWAY',
            }
        ]);
    });

    it('can handle an ocr scan', async () => {
        const res = createResponse();
        const req = createRequest({
            body: {
                voyageId: VOYAGE_ID,
                customData: {
                    isSuccess: true,
                    name: "Jonas",
                    lastName: "Granbom",
                    dateOfBirth: "02-11-1985",
                    nationality: "Norway",
                    gender: "Male"
                },
            }
        });

        await ScanApi.scanOcrHandler(req, res);

        const data = res._getJSONData();

        expect(data.status).toEqual('success');
        expect(data.data).toEqual([
            {
                firstName: 'Magnus',
                lastName: 'Midtbø',
                dateOfBirth: '1988-11-18',
                gender: 'MALE',
                homeCountry: 'NORWAY',
            }
        ]);
    });
});