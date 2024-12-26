import assert from "assert";
import { FastifyReply } from "fastify";
import { Request } from "./types";

export const dispatchOperation = (request: Request, reply: FastifyReply) => {
  const operationId = request.body.operation.id;
  const operation = request.operations[operationId];
  assert.ok(operation, `Operation ${operationId} not found`);
  return operation.handlerFn(request, reply);
};

export const dispatch = async (request: Request, reply: FastifyReply) => {
  const { body } = request;
  switch (body.type) {
    case "operation":
      return dispatchOperation(request, reply);
    default:
      throw new Error("Not implemented");
  }
};
