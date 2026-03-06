import ApiError, {
  ExtendableError,
  DetailedError,
  ResourceNotFoundError,
  UnauthorizedError,
  EndpointNotFoundError,
  MethodNotAllowedError,
  NotAcceptableError,
  UnsupportedMediaTypeError,
} from './../index';

describe('@dataverse/errors', () => {
  describe('ExtendableError', () => {
    it('should take an existing error and keep the stack trace', () => {
      const oldError = new Error('SomeError');

      const testedError = new ExtendableError('My tested error', 'error.code', oldError);

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.code');
      expect(testedError.name).toBe('ExtendableError');
      expect(testedError.stack).toContain('SomeError');
      expect(testedError.stack).toContain('\nCaused by:');
    });
  });

  describe('ApiError', () => {
    it('should create an instance with default parameters', () => {
      const testedError = new ApiError('My tested error', {});

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unexpected');
      expect(testedError.name).toBe('ApiError');
      expect(testedError.status).toBe(500);
      expect(testedError.isPublic).toBe(false);
    });

    it('should allow us to override to default parameters', () => {
      const oldError = new Error('SomeError');
      const testedError = new ApiError(
        'My tested error',
        { code: 'error.custom', isPublic: true, status: 404 },
        oldError,
      );

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.custom');
      expect(testedError.name).toBe('ApiError');
      expect(testedError.status).toBe(404);
      expect(testedError.isPublic).toBe(true);
      expect(testedError.stack).toContain('SomeError');
    });
  });

  describe('DetailedError', () => {
    it('should create an instance with default parameters', () => {
      const errorDetails = ['First detail', 'Second detail'];
      const testedError = new DetailedError('My tested error', errorDetails, {});

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unexpected');
      expect(testedError.name).toBe('DetailedError');
      expect(testedError.status).toBe(500);
      expect(testedError.isPublic).toBe(false);
      expect(testedError.details).toBe(errorDetails);
    });

    it('should allow us to include error details', () => {
      const errorDetails = ['First detail', 'Second detail'];
      const oldError = new Error('SomeError');

      const testedError = new DetailedError(
        'My tested error',
        errorDetails,
        {
          code: 'error.custom',
          isPublic: true,
          status: 404,
        },
        oldError,
      );

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.custom');
      expect(testedError.name).toBe('DetailedError');
      expect(testedError.status).toBe(404);
      expect(testedError.isPublic).toBe(true);
      expect(testedError.stack).toContain('SomeError');
      expect(testedError.details).toBe(errorDetails);
    });
  });

  describe('ResourceNotFoundError', () => {
    it('should create an instance with id parameter', () => {
      const testedError = new ResourceNotFoundError('My-resource-id');

      expect(testedError.message).toBe('Requested resource with ID: My-resource-id was not found');
      expect(testedError.code).toBe('error.resource.not-found');
      expect(testedError.name).toBe('ResourceNotFoundError');
      expect(testedError.status).toBe(404);
      expect(testedError.isPublic).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an instance with message parameter', () => {
      const testedError = new UnauthorizedError('My tested error');

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unauthorized');
      expect(testedError.name).toBe('UnauthorizedError');
      expect(testedError.status).toBe(401);
      expect(testedError.isPublic).toBe(true);
    });

    it('should create an instance with error parameter', () => {
      const error = new Error('SomeError');
      const testedError = new UnauthorizedError('My tested error', error);

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unauthorized');
      expect(testedError.name).toBe('UnauthorizedError');
      expect(testedError.stack).toContain('SomeError');
      expect(testedError.status).toBe(401);
      expect(testedError.isPublic).toBe(true);
    });
  });

  describe('EndpointNotFoundError', () => {
    it('should create an instance with message parameter', () => {
      const testedError = new EndpointNotFoundError('My tested error');

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.endpoint.not-found');
      expect(testedError.name).toBe('EndpointNotFoundError');
      expect(testedError.status).toBe(404);
      expect(testedError.isPublic).toBe(true);
    });

    it('should create an instance with error parameter', () => {
      const error = new Error('SomeError');
      const testedError = new EndpointNotFoundError('My tested error', error);

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.endpoint.not-found');
      expect(testedError.name).toBe('EndpointNotFoundError');
      expect(testedError.status).toBe(404);
      expect(testedError.isPublic).toBe(true);
      expect(testedError.stack).toContain('SomeError');
    });
  });

  describe('MethodNotAllowedError', () => {
    it('should create an instance with message parameter', () => {
      const testedError = new MethodNotAllowedError('My tested error');

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.method-not-allowed');
      expect(testedError.name).toBe('MethodNotAllowedError');
      expect(testedError.status).toBe(405);
      expect(testedError.isPublic).toBe(true);
    });

    it('should create an instance with error parameter', () => {
      const error = new Error('SomeError');
      const testedError = new MethodNotAllowedError('My tested error', error);

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.method-not-allowed');
      expect(testedError.name).toBe('MethodNotAllowedError');
      expect(testedError.status).toBe(405);
      expect(testedError.isPublic).toBe(true);
      expect(testedError.stack).toContain('SomeError');
    });
  });

  describe('NotAcceptableError', () => {
    it('should create an instance with message parameter', () => {
      const testedError = new NotAcceptableError('My tested error');

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.not-acceptable');
      expect(testedError.name).toBe('NotAcceptableError');
      expect(testedError.status).toBe(406);
      expect(testedError.isPublic).toBe(true);
    });

    it('should create an instance with error parameter', () => {
      const error = new Error('SomeError');
      const testedError = new NotAcceptableError('My tested error', error);

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.not-acceptable');
      expect(testedError.name).toBe('NotAcceptableError');
      expect(testedError.status).toBe(406);
      expect(testedError.isPublic).toBe(true);
      expect(testedError.stack).toContain('SomeError');
    });
  });

  describe('UnsupportedMediaTypeError', () => {
    it('should create an instance with message parameter', () => {
      const testedError = new UnsupportedMediaTypeError('My tested error');

      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unsupported-media-type');
      expect(testedError.name).toBe('UnsupportedMediaTypeError');
      expect(testedError.status).toBe(415);
      expect(testedError.isPublic).toBe(true);
    });

    it('should create an instance with error parameter', () => {
      const error = new Error('SomeError');
      const testedError = new UnsupportedMediaTypeError('My tested error', error);

      expect(testedError.stack).toContain('SomeError');
      expect(testedError.message).toBe('My tested error');
      expect(testedError.code).toBe('error.unsupported-media-type');
      expect(testedError.name).toBe('UnsupportedMediaTypeError');
      expect(testedError.status).toBe(415);
      expect(testedError.isPublic).toBe(true);
    });
  });
});
