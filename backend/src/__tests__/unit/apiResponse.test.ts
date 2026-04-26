import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('apiResponse helpers', () => {
  it('sendSuccess returns 200 with success:true', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: 'OK', data: { id: 1 } }));
  });

  it('sendSuccess respects custom status code', () => {
    const res = mockRes();
    sendSuccess(res, null, 'Created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('sendError returns 400 with success:false', () => {
    const res = mockRes();
    sendError(res, 'Bad request');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, message: 'Bad request' }));
  });

  it('sendPaginated includes pagination meta', () => {
    const res = mockRes();
    sendPaginated(res, [1, 2, 3], 30, 1, 10);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ pagination: { total: 30, page: 1, limit: 10, pages: 3 } })
    );
  });
});
