import docker

def change_team_category(external_id, new_category_id):
    client = docker.from_env()
    
    try:
        # 1. Access the database container
        container = client.containers.get("mariadb")

        # 2. Build the specific SQL Update
        sql = f"UPDATE team SET categoryid = {new_category_id} WHERE externalid = '{external_id}';"
        
        # 3. Execute via the mysql client inside the container
        # Using the credentials found in your dbpasswords.secret
        command = f"mysql -u domjudge -pdjpw domjudge -e \"{sql}\""
        
        result = container.exec_run(command)
        
        if result.exit_code == 0:
            print(f"Successfully changed team '{external_id}' to category {new_category_id}.")
            return True, None
        else:
            error_msg = f"Database Error: {result.output.decode()}"
            print(error_msg)
            return False, error_msg

    except Exception as e:
        error_msg = f"Error connecting to Docker: {e}"
        print(error_msg)
        return False, error_msg

if __name__ == "__main__":
    # Example usage
    change_team_category('exteam', 2)