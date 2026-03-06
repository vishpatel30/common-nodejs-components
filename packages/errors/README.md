# `@dataverse/errors`

Common errors used in the system

## Usage

## Creating custom errors

Create a class which should extend either APIError or Extendable error

```
export class TimeoutError extends ApiError {
  constructor(error?: Error) {
    super(
      "Request timeout error",
      {
        status: httpStatus.REQUEST_TIMEOUT,
        code: 'error.request-timeout',
/** if isPublic is set to true refers the error is known error and server should print the error message
if it's set to false, its unknown / unexpected error
*/
        isPublic: true,
      },
      error,
    );
  }
}

/** Use the created error class to throw error */
throw new TimeoutError(err);
```

## Using existing errors from the package
```
import { UnauthorizedError, ResourceNotFoundError } from '@dataverse/errors';

/** UnauthorizedError */
if (err instanceof UnauthorizedError) {
  throw new UnauthorizedError(err.message, err));
}

/** ResourceNotFoundError */
if(!resource){
 throw new ResourceNotFoundError(workspaceId.toString());
}

```
