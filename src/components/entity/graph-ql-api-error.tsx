import { APIError, GraphQLResponseError } from "graphql-hooks"

export function GraphQLError(
    {
        error,
        className = ''
    }: {
        error: APIError<GraphQLResponseError>
        className?: string
    }
) {
    return <h2 className={`text-xl text-error font-semibold ${className}`}>{error.fetchError ? error.fetchError.message
        : error.graphQLErrors ? error.graphQLErrors[0].message
            : error.httpError ? error.httpError.body
                : ''}
    </h2>
}